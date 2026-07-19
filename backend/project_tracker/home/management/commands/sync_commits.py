from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from home.models import Project, Timesheet, TimesheetTask
from home.views import _parse_time_from_message, _get_github_profile_name, _get_commit_stats, _clean_time_from_message
import requests
from django.utils.dateparse import parse_datetime
from datetime import datetime
import time

class Command(BaseCommand):
    help = 'Sync all commits from GitHub for a project'

    def add_arguments(self, parser):
        parser.add_argument('project_id', type=int, help='The ID of the project to sync')
        parser.add_argument('--limit', type=int, default=0, help='Max commits to fetch (0 for all)')

    def handle(self, *args, **options):
        project_id = options['project_id']
        limit = options['limit']
        
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            raise CommandError(f'Project with ID {project_id} does not exist')
            
        if not project.github_repo:
            raise CommandError(f'Project "{project.name}" has no github_repo path configured')
            
        self.stdout.write(self.style.WARNING(f'Starting sync for "{project.name}" (Repo: {project.github_repo})...'))
        
        token = getattr(settings, "GITHUB_TOKEN", None)
        headers = {"Accept": "application/vnd.github+json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            self.stdout.write(self.style.SUCCESS('Using GITHUB_TOKEN for authenticated API calls.'))
        else:
            self.stdout.write(self.style.WARNING('No GITHUB_TOKEN configured. Unauthenticated requests might hit rate limits!'))
            
        page = 1
        total_synced = 0
        
        while True:
            url = f"https://api.github.com/repos/{project.github_repo}/commits"
            params = {"per_page": 100, "page": page}
            
            try:
                resp = requests.get(url, headers=headers, params=params, timeout=15)
                if resp.status_code == 403:
                    self.stdout.write(self.style.ERROR(f'GitHub API Rate limit exceeded. Response: {resp.text}'))
                    break
                elif resp.status_code != 200:
                    self.stdout.write(self.style.ERROR(f'Failed to fetch page {page}: Status {resp.status_code}. Details: {resp.text}'))
                    break
                    
                commits_data = resp.json()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Network error: {str(e)}'))
                break
                
            if not commits_data:
                break  # No more commits
                
            self.stdout.write(f'Processing page {page} ({len(commits_data)} commits)...')
            
            for item in commits_data:
                if limit > 0 and total_synced >= limit:
                    self.stdout.write(self.style.SUCCESS(f'Reached limit of {limit} commits.'))
                    return
                    
                sha = item.get("sha", "")
                commit_info = item.get("commit", {})
                commit_message = commit_info.get("message", "")
                
                # Check duplicate task using the github_sha field in TimesheetTask
                if TimesheetTask.objects.filter(timesheet__project=project, github_sha=sha).exists():
                    continue
                    
                # Parse date
                author_info = commit_info.get("author", {})
                timestamp_str = author_info.get("date")
                commit_date = datetime.today().date()
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
                    # Parse hours
                    hours = _parse_time_from_message(commit_message)
                    if hours is None:
                        # Fetch detailed stats (churn)
                        stats_data = _get_commit_stats(project.github_repo, sha)
                        churn = stats_data.get("churn", 0)
                        if churn > 0:
                            hours = project.churn_to_hours(churn)
                        else:
                            hours = 0.0
                        # Sleep slightly to avoid hitting GitHub API rate limit/abuse detection too fast
                        time.sleep(0.2)
                        
                task_description = _clean_time_from_message(commit_message)
                
                # Get username
                github_user = item.get("author") or {}
                github_username = github_user.get("login")
                
                author_name = None
                if github_username:
                    author_name = _get_github_profile_name(github_username)
                if not author_name:
                    author_name = github_username or author_info.get("name") or "Unknown"
                    
                # Get or create Timesheet
                timesheet, created = Timesheet.objects.get_or_create(
                    project=project,
                    employee_name=author_name,
                    date=commit_date,
                    source="GITHUB_COMMIT",
                    defaults={
                        'hourly_rate': project.hourly_rate,
                        'total_hours': 0,
                        'total_amount': 0,
                        'github_sha': sha,
                    }
                )
                
                # Create Task
                task_amount = round(float(hours) * float(project.hourly_rate), 2)
                TimesheetTask.objects.create(
                    timesheet=timesheet,
                    description=task_description,
                    hours=hours,
                    amount=task_amount,
                    github_sha=sha,
                )
                
                # Recalculate parent timesheet totals
                from django.db.models import Sum
                totals = timesheet.tasks.aggregate(total_h=Sum('hours'), total_a=Sum('amount'))
                timesheet.total_hours = totals['total_h'] or 0
                timesheet.total_amount = totals['total_a'] or 0
                timesheet.save(update_fields=['total_hours', 'total_amount'])
                
                total_synced += 1
                
            page += 1
            # Sleep between pages
            time.sleep(0.5)
            
        self.stdout.write(self.style.SUCCESS(f'Finished! Synced a total of {total_synced} new commits.'))
