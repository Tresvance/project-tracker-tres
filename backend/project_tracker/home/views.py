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
                
                # Skip if we already have this commit
                if commit_id and Timesheet.objects.filter(github_sha=commit_id).exists():
                    continue
                    
                author_name = commit.get('author', {}).get('name', 'Unknown')
                commit_message = commit.get('message', 'No commit message')
                timestamp_str = commit.get('timestamp')
                
                commit_date = timezone.now().date()
                if timestamp_str:
                    try:
                        parsed_dt = parse_datetime(timestamp_str)
                        if parsed_dt:
                            commit_date = parsed_dt.date()
                    except ValueError:
                        pass
                
                # Create the Timesheet with 0 hours, allowing manual time entry
                timesheet = Timesheet.objects.create(
                    project=project,
                    employee_name=author_name,
                    date=commit_date,
                    hourly_rate=project.hourly_rate,
                    total_hours=0,
                    total_amount=0,
                    source="GITHUB_COMMIT",
                    github_sha=commit_id,
                )
                
                # Create the corresponding task with the commit message
                TimesheetTask.objects.create(
                    timesheet=timesheet,
                    description=commit_message,
                    hours=0,
                    amount=0,
                )
                created_count += 1
                
        return Response({"message": f"Created {created_count} timesheets from commits"}, status=status.HTTP_201_CREATED)
        
    return Response({"message": "Unhandled event type"}, status=status.HTTP_200_OK)