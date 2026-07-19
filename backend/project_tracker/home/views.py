from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Project, Timesheet, TimesheetTask
from .serializers import (
    ProjectSerializer,
    TimesheetSerializer,
    TimesheetCreateSerializer,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
import requests



class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset         = Project.objects.all()
    serializer_class = ProjectSerializer


class TimesheetViewSet(viewsets.ModelViewSet):
    queryset         = Timesheet.objects.all().prefetch_related("tasks")
    serializer_class = TimesheetSerializer

    def get_queryset(self):
        qs       = super().get_queryset()
        project  = self.request.query_params.get("project")
        employee = self.request.query_params.get("employee")
        source   = self.request.query_params.get("source")  # MANUAL / GITHUB_COMMIT / GITHUB_PR
        if project:
            qs = qs.filter(project_id=project)
        if employee:
            qs = qs.filter(employee_name__icontains=employee)
        if source:
            qs = qs.filter(source=source)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = TimesheetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        timesheet = serializer.save()
        return Response(
            TimesheetSerializer(timesheet).data,
            status=status.HTTP_201_CREATED,
        )


def _get_github_profile_name(username):
    if not username:
        return None
        
    cache_key = f"github_profile_name_{username}"
    profile_name = cache.get(cache_key)
    if profile_name:
        return profile_name
        
    url = f"https://api.github.com/users/{username}"
    headers = {"Accept": "application/vnd.github+json"}
    
    token = getattr(settings, "GITHUB_TOKEN", None)
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    try:
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            # "name" is the display name (e.g. "Jobin Jose"), "login" is username
            profile_name = data.get("name") or data.get("login")
            if profile_name:
                cache.set(cache_key, profile_name, timeout=86400) # Cache for 24 hours
                return profile_name
    except Exception:
        pass
        
    return None


@api_view(['POST'])
@permission_classes([AllowAny])
def github_webhook(request):
    event = request.META.get('HTTP_X_GITHUB_EVENT', 'ping')
    if event == 'ping':
        return Response({"message": "Pong"}, status=status.HTTP_200_OK)
    
    if event == 'push':
        payload = request.data
        repository = payload.get('repository', {})
        repo_full_name = repository.get('full_name')
        
        if not repo_full_name:
            return Response({"error": "No repository full_name found"}, status=status.HTTP_400_BAD_REQUEST)
            
        projects = Project.objects.filter(github_repo__iexact=repo_full_name)
        if not projects.exists():
            return Response({"message": f"No project matches repo {repo_full_name}"}, status=status.HTTP_200_OK)
            
        commits = payload.get('commits', [])
        if not commits:
            return Response({"message": "No commits in push"}, status=status.HTTP_200_OK)
            
        created_count = 0
        for project in projects:
            for commit in commits:
                commit_id = commit.get('id', '')
                commit_message = commit.get('message', 'No commit message')
                
                # Format task description with commit ID prefix
                task_description = f"[commit {commit_id[:7]}] {commit_message}"
                
                # Skip if we already have this commit registered in any task for this project
                commit_prefix = f"[commit {commit_id[:7]}]"
                if TimesheetTask.objects.filter(timesheet__project=project, description__startswith=commit_prefix).exists():
                    continue
                    
                # Try to get GitHub Profile Display Name, fallback to Username, then Git Name
                github_username = commit.get('author', {}).get('username')
                author_name = None
                if github_username:
                    author_name = _get_github_profile_name(github_username)
                    
                if not author_name:
                    author_name = github_username or commit.get('author', {}).get('name', 'Unknown')
                    
                timestamp_str = commit.get('timestamp')
                commit_date = timezone.now().date()
                if timestamp_str:
                    try:
                        parsed_dt = parse_datetime(timestamp_str)
                        if parsed_dt:
                            commit_date = parsed_dt.date()
                    except ValueError:
                        pass
                
                # Get or create a single Timesheet for this person on this day
                timesheet, created = Timesheet.objects.get_or_create(
                    project=project,
                    employee_name=author_name,
                    date=commit_date,
                    source="GITHUB_COMMIT",
                    defaults={
                        'hourly_rate': project.hourly_rate,
                        'total_hours': 0,
                        'total_amount': 0,
                        'github_sha': commit_id,
                    }
                )
                
                # Create the task with the commit message under the grouped timesheet
                TimesheetTask.objects.create(
                    timesheet=timesheet,
                    description=task_description,
                    hours=0,
                    amount=0,
                )
                created_count += 1
                
        return Response({"message": f"Processed {created_count} commits into timesheets"}, status=status.HTTP_201_CREATED)
        
    return Response({"message": "Unhandled event type"}, status=status.HTTP_200_OK)
