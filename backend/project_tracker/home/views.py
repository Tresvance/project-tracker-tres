from rest_framework import viewsets, status
from rest_framework.response import Response
from .models import Project, Timesheet, TimesheetTask, DeployScript, Task, AdminLogin
from .serializers import (
    ProjectSerializer,
    TimesheetSerializer,
    TimesheetCreateSerializer,
    TaskSerializer,
    AdminLoginSerializer,
)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
import requests
import re




class ProjectViewSet(viewsets.ModelViewSet):
    queryset         = Project.objects.all()
    serializer_class = ProjectSerializer

    def create(self, request, *args, **kwargs):
        data = request.data
        name = data.get("name")
        mode = data.get("mode", "DEV")
        version = data.get("version", "")
        url = data.get("url", "")
        remarks = data.get("remarks", "")
        hourly_rate = data.get("hourly_rate", 0)
        test_deploy_command = data.get("test_deploy_command", "")
        deploy_command = data.get("deploy_command", "")
        github_repo = data.get("github_repo", "")
        
        project = Project.objects.create(
            name=name,
            mode=mode,
            version=version,
            url=url,
            remarks=remarks,
            hourly_rate=hourly_rate,
            test_deploy_command=test_deploy_command,
            deploy_command=deploy_command,
            github_repo=github_repo
        )
        
        deploy_scripts_data = data.get("deploy_scripts", [])
        created_scripts = []
        for ds in deploy_scripts_data:
            label = ds.get("label")
            cmd = ds.get("command")
            if label and cmd:
                script = DeployScript.objects.create(
                    project=project,
                    label=label,
                    command=cmd
                )
                created_scripts.append(script)
                
        if created_scripts:
            project.active_deploy_script = created_scripts[0]
            project.save()

        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


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


def _parse_time_from_message(message: str) -> float:
    # Match patterns like [1.5h], [45m], [1h 30m], [2 hrs], etc. anywhere in the message
    matches = re.findall(r'\[([^\]]+)\]', message)
    for text in reversed(matches):
        text = text.lower().strip()
        hours = 0.0
        found = False
        
        # Check for hours: e.g. "1.5h", "2 hours", "1.5 hrs"
        h_match = re.search(r'(\d*\.?\d+)\s*(?:h|hr|hour)', text)
        if h_match:
            hours += float(h_match.group(1))
            found = True
            
        # Check for minutes: e.g. "30m", "45 mins"
        m_match = re.search(r'(\d+)\s*(?:m|min)', text)
        if m_match:
            hours += float(m_match.group(1)) / 60.0
            found = True
            
        if found:
            return round(hours, 2)
            
        # Fallback to pure number inside bracket, e.g. [1.5]
        try:
            return round(float(text), 2)
        except ValueError:
            pass
            
    return None


def _get_commit_stats(repo_full_name: str, sha: str) -> dict:
    token   = getattr(settings, "GITHUB_TOKEN", None)
    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    url = f"https://api.github.com/repos/{repo_full_name}/commits/{sha}"
    try:
        resp = requests.get(url, headers=headers, timeout=8)
        if resp.status_code == 200:
            data      = resp.json()
            stats     = data.get("stats", {})
            additions = stats.get("additions", 0)
            deletions = stats.get("deletions", 0)
            return {"additions": additions, "deletions": deletions, "churn": additions + deletions}
    except Exception:
        pass
    return {"additions": 0, "deletions": 0, "churn": 0}


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


def _clean_time_from_message(message: str) -> str:
    # Find all bracketed parts and remove those that we can parse as time spent
    matches = re.findall(r'\[([^\]]+)\]', message)
    cleaned = message
    for text in matches:
        parsed_text = text.lower().strip()
        found = False
        h_match = re.search(r'(\d*\.?\d+)\s*(?:h|hr|hour)', parsed_text)
        if h_match:
            found = True
        m_match = re.search(r'(\d+)\s*(?:m|min)', parsed_text)
        if m_match:
            found = True
        if not found:
            try:
                float(parsed_text)
                found = True
            except ValueError:
                pass
        
        if found:
            escaped_text = re.escape(text)
            cleaned = re.sub(r'\[\s*' + escaped_text + r'\s*\]', '', cleaned)
            
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login_view(request):
    email = request.data.get("email") or request.data.get("username")
    password = request.data.get("password")
    
    from .models import AdminLogin
    user = AdminLogin.objects.filter(email=email, password=password).first()
    if user:
        return Response({"success": True, "name": user.name})
    else:
        return Response({"success": False, "error": "Invalid credentials"})


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
                
                # Check for duplicate task using the github_sha field in TimesheetTask
                if TimesheetTask.objects.filter(timesheet__project=project, github_sha=commit_id).exists():
                    continue
                    
                # Parse commit date
                timestamp_str = commit.get('timestamp')
                commit_date = timezone.now().date()
                if timestamp_str:
                    try:
                        parsed_dt = parse_datetime(timestamp_str)
                        if parsed_dt:
                            commit_date = parsed_dt.date()
                    except ValueError:
                        pass
                
                # Check if it is a merge commit (billing should be 0.0)
                msg_lower = commit_message.lower().strip()
                is_merge = msg_lower.startswith("merge ") or msg_lower.startswith("merge pull request") or "merge branch" in msg_lower
                
                if is_merge:
                    hours = 0.0
                else:
                    # 1. Parse time from commit message (e.g. "[1.5h]")
                    hours = _parse_time_from_message(commit_message)
                    
                    # 2. Fallback: estimate time based on churn from GitHub API (20 seconds per line changed)
                    if hours is None:
                        stats = _get_commit_stats(repo_full_name, commit_id)
                        churn = stats.get("churn", 0)
                        if churn > 0:
                            hours = project.churn_to_hours(churn)
                        else:
                            hours = 0.0  # Fallback to 0.0 if API fails or no changes
                        
                # Clean the commit message by removing the time spent bracket
                task_description = _clean_time_from_message(commit_message)
                    
                # Try to get GitHub Profile Display Name, fallback to Username, then Git Name
                github_username = commit.get('author', {}).get('username')
                author_name = None
                if github_username:
                    author_name = _get_github_profile_name(github_username)
                    
                if not author_name:
                    author_name = github_username or commit.get('author', {}).get('name', 'Unknown')
                
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
                
                # Calculate the task amount based on hours and hourly rate
                task_amount = round(float(hours) * float(project.hourly_rate), 2)
                
                # Create the task with the commit message under the grouped timesheet
                TimesheetTask.objects.create(
                    timesheet=timesheet,
                    description=task_description,
                    hours=hours,
                    amount=task_amount,
                    github_sha=commit_id,
                )
                
                # Re-calculate totals on parent timesheet
                from django.db.models import Sum
                totals = timesheet.tasks.aggregate(total_h=Sum('hours'), total_a=Sum('amount'))
                timesheet.total_hours = totals['total_h'] or 0
                timesheet.total_amount = totals['total_a'] or 0
                timesheet.save(update_fields=['total_hours', 'total_amount'])
                
                created_count += 1
                
        return Response({"message": f"Processed {created_count} commits into timesheets"}, status=status.HTTP_201_CREATED)
        
    return Response({"message": "Unhandled event type"}, status=status.HTTP_200_OK)


class TaskViewSet(viewsets.ModelViewSet):
    queryset         = Task.objects.all()
    serializer_class = TaskSerializer


class AdminLoginViewSet(viewsets.ReadOnlyModelViewSet):
    queryset         = AdminLogin.objects.all()
    serializer_class = AdminLoginSerializer
