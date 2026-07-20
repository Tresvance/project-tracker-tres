from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.db.models import Sum
from django.http import HttpResponse
from django.urls import path
from django.conf import settings
from datetime import date as dt, timedelta
import paramiko
import threading
from django.core.cache import cache
from .models import Project, Timesheet, TimesheetTask, DeployScript, BankAccount, AdminLogin, Task


# ── Deploy Script Inline (the "+ Add another" table, for LIVE scripts) ─────────
class DeployScriptInline(admin.TabularInline):
    model = DeployScript
    extra = 1
    fields = ('label', 'command')


# ── Custom form to render active_deploy_script as radio buttons ───────────────
class ProjectAdminForm(forms.ModelForm):
    class Meta:
        model = Project
        fields = '__all__'
        widgets = {
            'active_deploy_script': forms.RadioSelect,
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        instance = kwargs.get('instance')
        if instance and instance.pk:
            self.fields['active_deploy_script'].queryset = instance.deploy_scripts.all()
        else:
            self.fields['active_deploy_script'].queryset = DeployScript.objects.none()
        self.fields['active_deploy_script'].empty_label = None


# ── Project Admin ──────────────────────────────────────────────────────────────
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    form = ProjectAdminForm
    inlines = [DeployScriptInline]
    change_list_template = "admin/home/project/change_list.html"
    list_display = ('name', 'mode', 'version', 'hourly_rate_display', 'total_timesheets', 'total_hours_logged', 'total_billed', 'active_script_display', 'report_buttons')
    list_filter = ('mode',)
    search_fields = ('name', 'remarks')
    fieldsets = (
        ('Project Info', {'fields': ('name', 'mode', 'version', 'url', 'remarks')}),
        ('Billing Rate', {
            'fields': ('hourly_rate',),
            'description': '⚙️ Set the hourly rate (₹) for this project. Employees will NOT see this rate.'
        }),
        ('GitHub Integration', {
            'fields': ('github_repo',),
            'description': '🔗 GitHub repository path in "owner/repo" format, e.g. "myorg/myrepo".'
        }),
        ('Live Deployment', {
            'fields': ('active_deploy_script',),
            'description': '🚀 Add live deploy scripts below (save first if this is a new project), then pick which one runs. Go to the Deploy Center (button on project list) to actually run deploys.'
        }),
        ('Test Server Deployment', {
            'fields': ('test_deploy_command',),
            'description': '🧪 Single command for deploying to the TEST server. No multiple scripts — just one command.'
        }),
    )

    actions = ['sync_github_commits']

    def sync_github_commits(self, request, queryset):
        from django.contrib import messages
        import requests
        from django.utils.dateparse import parse_datetime
        from .models import Timesheet, TimesheetTask
        from home.views import (
            _parse_time_from_message,
            _get_github_profile_name,
            _get_commit_stats,
            _clean_time_from_message
        )
        
        total_created = 0
        
        for project in queryset:
            if not project.github_repo:
                self.message_user(request, f"⚠️ Project '{project.name}' has no GitHub Repo path configured.", level=messages.WARNING)
                continue
                
            url = f"https://api.github.com/repos/{project.github_repo}/commits"
            headers = {"Accept": "application/vnd.github+json"}
            token = getattr(settings, "GITHUB_TOKEN", None)
            if token:
                headers["Authorization"] = f"Bearer {token}"
                
            try:
                # Fetch last 100 commits
                resp = requests.get(url, headers=headers, params={"per_page": 100}, timeout=15)
                if resp.status_code != 200:
                    self.message_user(
                        request,
                        f"❌ Failed to fetch commits for '{project.name}' from GitHub (Status {resp.status_code}). "
                        f"Ensure repo path is correct and public, or GITHUB_TOKEN is set for private repos.",
                        level=messages.ERROR
                    )
                    continue
                    
                commits_data = resp.json()
            except Exception as e:
                self.message_user(request, f"❌ Network error connecting to GitHub for '{project.name}': {str(e)}", level=messages.ERROR)
                continue
                
            project_created = 0
            for item in commits_data:
                sha = item.get("sha", "")
                commit_info = item.get("commit", {})
                commit_message = commit_info.get("message", "")
                
                # Check duplicate task using the github_sha field in TimesheetTask
                if TimesheetTask.objects.filter(timesheet__project=project, github_sha=sha).exists():
                    continue
                    
                # Parse date
                author_info = commit_info.get("author", {})
                timestamp_str = author_info.get("date")
                commit_date = dt.today()
                if timestamp_str:
                    try:
                        parsed_dt = parse_datetime(timestamp_str)
                        if parsed_dt:
                            commit_date = parsed_dt.date()
                    except ValueError:
                        pass
                
                # Parse hours
                hours = _parse_time_from_message(commit_message)
                if hours is None:
                    # Fetch detailed stats for this commit (churn)
                    stats_data = _get_commit_stats(project.github_repo, sha)
                    churn = stats_data.get("churn", 0)
                    if churn > 0:
                        hours = project.churn_to_hours(churn)
                    else:
                        hours = 0.0
                        
                task_description = _clean_time_from_message(commit_message)
                
                # Get GitHub Username
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
                
                # Calculate the task amount based on hours and hourly rate
                task_amount = round(float(hours) * float(project.hourly_rate), 2)
                
                # Create Task
                TimesheetTask.objects.create(
                    timesheet=timesheet,
                    description=task_description,
                    hours=hours,
                    amount=task_amount,
                    github_sha=sha,
                )
                
                # Recalculate timesheet totals
                from django.db.models import Sum
                totals = timesheet.tasks.aggregate(total_h=Sum('hours'), total_a=Sum('amount'))
                timesheet.total_hours = totals['total_h'] or 0
                timesheet.total_amount = totals['total_a'] or 0
                timesheet.save(update_fields=['total_hours', 'total_amount'])
                
                project_created += 1
                total_created += 1
                
            self.message_user(request, f"✅ Successfully synced {project_created} new commits for '{project.name}'.", level=messages.SUCCESS)
            
    sync_github_commits.short_description = "🔄 Sync last 100 commits from GitHub"


    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('<int:project_id>/report/monthly/', self.admin_site.admin_view(self.monthly_report), name='project_monthly_report'),
            path('<int:project_id>/report/all/', self.admin_site.admin_view(self.all_report), name='project_all_report'),
            path('<int:project_id>/deploy/', self.admin_site.admin_view(self.deploy_project), name='project_deploy'),
            path('<int:project_id>/deploy/status/', self.admin_site.admin_view(self.deploy_status), name='project_deploy_status'),
            path('<int:project_id>/deploy-test/', self.admin_site.admin_view(self.deploy_test_project), name='project_deploy_test'),
            path('<int:project_id>/deploy-test/status/', self.admin_site.admin_view(self.deploy_test_status), name='project_deploy_test_status'),
            path('deploy-center/', self.admin_site.admin_view(self.deploy_center), name='project_deploy_center'),
        ]
        return custom + urls

    def hourly_rate_display(self, obj):
        return format_html('<strong style="color:#1a6b3a;">₹{}/hr</strong>', obj.hourly_rate)
    hourly_rate_display.short_description = 'Rate'

    def total_timesheets(self, obj):
        return obj.timesheets.count()
    total_timesheets.short_description = 'Timesheets'

    def total_hours_logged(self, obj):
        r = obj.timesheets.aggregate(total=Sum('total_hours'))
        return f"{r['total'] or 0} hrs"
    total_hours_logged.short_description = 'Total Hours'

    def total_billed(self, obj):
        r = obj.timesheets.aggregate(total=Sum('total_amount'))
        amount = '{:,.2f}'.format(r['total'] or 0)
        return format_html('<strong style="color:#1a6b3a;">₹{}</strong>', amount)
    total_billed.short_description = 'Total Billed'

    def active_script_display(self, obj):
        if obj.active_deploy_script:
            return format_html(
                '<span style="background:#1c2530;color:#29ABE2;padding:4px 10px;border-radius:4px;'
                'font-size:11px;font-weight:700;white-space:nowrap;">📜 {}</span>',
                obj.active_deploy_script.label
            )
        return mark_safe(
            '<span style="background:#2a2a2a;color:#888;padding:4px 10px;border-radius:4px;'
            'font-size:11px;white-space:nowrap;">— none selected —</span>'
        )
    active_script_display.short_description = 'Active Script'

    def report_buttons(self, obj):
        # Query distinct months that have timesheets for this project
        dates = Timesheet.objects.filter(project=obj).dates('date', 'month', order='DESC')
        if not dates:
            # Fallback: last 6 months
            from datetime import date
            from dateutil.relativedelta import relativedelta
            today = date.today()
            dates = [today - relativedelta(months=i) for i in range(6)]

        options = []
        for d in dates:
            month_name = d.strftime('%b')
            year_val = d.year
            month_val = d.month
            val = f"{obj.pk}/report/monthly/?year={year_val}&month={month_val}"
            options.append(f'<option value="{val}" style="background:#fff;color:#333;">{month_name} {year_val}</option>')

        options_str = "\n".join(options)

        return format_html(
            '<div style="display:flex;gap:6px;align-items:center;flex-wrap:nowrap;">'
            '<select onchange="if(this.value) {{ window.open(this.value, \'_blank\'); this.selectedIndex=0; }}" style="background:#1a6b3a;color:#fff;padding:4px 8px;border-radius:4px;border:none;font-size:11px;font-weight:700;cursor:pointer;outline:none;height:24px;line-height:16px;">'
            '<option value="" style="background:#fff;color:#333;">📆 Monthly</option>'
            '{}'
            '</select>'
            '<a href="{}/report/all/" target="_blank" style="background:#111;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;height:24px;line-height:16px;display:flex;align-items:center;">📋 All</a>'
            '</div>',
            mark_safe(options_str), obj.pk
        )
    report_buttons.short_description = 'Reports'

    # ── Deploy Center (standalone dashboard page) ──────────────────────────────
    def deploy_center(self, request):
        projects = Project.objects.filter(
            models.Q(active_deploy_script__isnull=False) | models.Q(test_deploy_command__gt='')
        ).select_related('active_deploy_script').distinct() if False else Project.objects.select_related('active_deploy_script')

        # keep only projects that have at least one of the two configured
        projects = [p for p in projects if p.active_deploy_script or p.test_deploy_command]

        cards = ""
        for p in projects:
            script = p.active_deploy_script

            live_block = ""
            if script:
                live_block = f"""
                <div class="dc-script">
                    <span class="dc-label">Live Script</span>
                    <span class="dc-script-name">📜 {script.label}</span>
                    <code class="dc-cmd">{script.command}</code>
                </div>
                <a href="/admin/home/project/{p.pk}/deploy/" target="_blank"
                   onclick="return confirm('Deploy {p.name} to LIVE? This will run \\'{script.label}\\' on the VPS.');"
                   class="dc-btn dc-btn-live">🚀 Deploy Live Server</a>"""

            test_block = ""
            if p.test_deploy_command:
                test_block = f"""
                <div class="dc-script">
                    <span class="dc-label">Test Command</span>
                    <code class="dc-cmd">{p.test_deploy_command}</code>
                </div>
                <a href="/admin/home/project/{p.pk}/deploy-test/" target="_blank"
                   onclick="return confirm('Deploy {p.name} to TEST server?');"
                   class="dc-btn dc-btn-test">🧪 Deploy Test Server</a>"""

            cards += f"""
            <div class="deploy-card">
                <div class="dc-top">
                    <div class="dc-name">{p.name}</div>
                    <div class="dc-mode">{p.mode}</div>
                </div>
                {live_block}
                {test_block}
            </div>"""

        if not cards:
            cards = '<div class="dc-empty">No projects have a live script or test command yet.<br>Go to a project → Deployment sections → add one.</div>'

        return HttpResponse(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Deploy Center</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',sans-serif;background:#0b0e14;color:#e6edf3;min-height:100vh}}
.topbar{{background:#111722;padding:22px 40px;border-bottom:1px solid #1f2733;display:flex;justify-content:space-between;align-items:center}}
.topbar h1{{font-size:19px;font-weight:800;letter-spacing:0.3px}}
.topbar h1 span{{color:#29ABE2}}
.topbar a{{color:#8bc9ea;font-size:12px;text-decoration:none;font-weight:600}}
.topbar a:hover{{text-decoration:underline}}
.sub{{padding:18px 40px 0;font-size:13px;color:#7d8590}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;padding:24px 40px 50px}}
.deploy-card{{background:#141a24;border:1px solid #232b38;border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:12px;transition:border-color .15s}}
.deploy-card:hover{{border-color:#29ABE2}}
.dc-top{{display:flex;justify-content:space-between;align-items:center}}
.dc-name{{font-size:16px;font-weight:700;color:#fff}}
.dc-mode{{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7d8590;background:#1c2530;padding:3px 8px;border-radius:4px}}
.dc-script{{background:#0d1117;border-radius:6px;padding:12px 14px;display:flex;flex-direction:column;gap:6px}}
.dc-label{{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:#5c6773;font-weight:700}}
.dc-script-name{{font-size:13px;color:#8bc9ea;font-weight:700}}
.dc-cmd{{font-family:'JetBrains Mono',monospace;font-size:11px;color:#7d8590;word-break:break-all}}
.dc-btn{{text-align:center;padding:11px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:700;transition:background .15s}}
.dc-btn-live{{background:#e2542f;color:#fff}}
.dc-btn-live:hover{{background:#c9421f}}
.dc-btn-test{{background:#8a5cf6;color:#fff}}
.dc-btn-test:hover{{background:#7444e0}}
.dc-empty{{grid-column:1/-1;text-align:center;padding:60px 20px;color:#5c6773;font-size:14px;line-height:1.8}}
</style>
</head>
<body>
<div class="topbar">
  <h1>🚀 Deploy <span>Center</span></h1>
  <a href="/admin/home/project/">← Back to Projects</a>
</div>
<div class="sub">Showing {len(cards.strip()) and len(projects) or 0} project(s) with live and/or test deploy configured.</div>
<div class="grid">{cards}</div>
</body></html>""")

    # ── Live Deploy ──────────────────────────────────────────────────────────
    def deploy_project(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)

        script = project.active_deploy_script
        if not script:
            return HttpResponse("No deploy script selected for this project.", status=400)

        cache_key = f"deploy_status_{project_id}"
        cache.set(cache_key, {"status": "running", "started": dt.today().isoformat()}, timeout=900)

        def run_deploy():
            output, error, exit_status, ok = "", "", None, False
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(
                    hostname=settings.DEPLOY_SSH_HOST,
                    username=settings.DEPLOY_SSH_USER,
                    key_filename=settings.DEPLOY_SSH_KEY_PATH,
                    timeout=15,
                )
                stdin, stdout, stderr = client.exec_command(script.command, timeout=600)
                output = stdout.read().decode(errors='replace')
                error = stderr.read().decode(errors='replace')
                exit_status = stdout.channel.recv_exit_status()
                ok = (exit_status == 0)
                client.close()
            except Exception as e:
                error = str(e)
                ok = False

            cache.set(cache_key, {
                "status": "done", "ok": ok, "output": output, "error": error,
                "exit_status": exit_status, "command": script.command,
            }, timeout=900)

        threading.Thread(target=run_deploy, daemon=True).start()
        return HttpResponse(self._build_deploy_waiting(project, "Live Server"))

    def deploy_status(self, request, project_id):
        cache_key = f"deploy_status_{project_id}"
        state = cache.get(cache_key)
        project = Project.objects.get(pk=project_id)

        if not state or state.get("status") == "running":
            return HttpResponse(self._build_deploy_waiting(project, "Live Server"))

        return HttpResponse(self._build_deploy_result(
            project, state["command"], state["output"], state["error"],
            state["exit_status"], state["ok"], "Live Server"
        ))

    # ── Test Deploy ──────────────────────────────────────────────────────────
    def deploy_test_project(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)

        command = project.test_deploy_command
        if not command:
            return HttpResponse("No test deploy command set for this project.", status=400)

        cache_key = f"deploy_test_status_{project_id}"
        cache.set(cache_key, {"status": "running", "started": dt.today().isoformat()}, timeout=900)

        def run_deploy():
            output, error, exit_status, ok = "", "", None, False
            try:
                client = paramiko.SSHClient()
                client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                client.connect(
                    hostname=settings.DEPLOY_SSH_HOST,
                    username=settings.DEPLOY_SSH_USER,
                    key_filename=settings.DEPLOY_SSH_KEY_PATH,
                    timeout=15,
                )
                stdin, stdout, stderr = client.exec_command(command, timeout=600)
                output = stdout.read().decode(errors='replace')
                error = stderr.read().decode(errors='replace')
                exit_status = stdout.channel.recv_exit_status()
                ok = (exit_status == 0)
                client.close()
            except Exception as e:
                error = str(e)
                ok = False

            cache.set(cache_key, {
                "status": "done", "ok": ok, "output": output, "error": error,
                "exit_status": exit_status, "command": command,
            }, timeout=900)

        threading.Thread(target=run_deploy, daemon=True).start()
        return HttpResponse(self._build_deploy_waiting(project, "Test Server"))

    def deploy_test_status(self, request, project_id):
        cache_key = f"deploy_test_status_{project_id}"
        state = cache.get(cache_key)
        project = Project.objects.get(pk=project_id)

        if not state or state.get("status") == "running":
            return HttpResponse(self._build_deploy_waiting(project, "Test Server"))

        return HttpResponse(self._build_deploy_result(
            project, state["command"], state["output"], state["error"],
            state["exit_status"], state["ok"], "Test Server"
        ))

    def _build_deploy_waiting(self, project, target_label):
        status_url = "deploy" if target_label == "Live Server" else "deploy-test"
        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="2;url=/admin/home/project/{project.pk}/{status_url}/status/">
<title>Deploying – {project.name}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',sans-serif;background:#0d1117;color:#c9d1d9;display:flex;align-items:center;justify-content:center;height:100vh}}
.box{{text-align:center}}
.ring{{
  width:90px;height:90px;border-radius:50%;margin:0 auto 24px;position:relative;
  background:conic-gradient(#29ABE2 0deg, #29ABE2 270deg, #1c2530 270deg, #1c2530 360deg);
  animation:spin 1.1s linear infinite;
}}
.ring::before{{
  content:"";position:absolute;top:8px;left:8px;right:8px;bottom:8px;
  background:#0d1117;border-radius:50%;
}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
h1{{font-size:16px;font-weight:600;margin-bottom:6px}}
p{{font-size:12px;color:#888;margin-top:4px}}
.timer{{font-size:13px;color:#29ABE2;font-weight:700;margin-top:14px;font-family:'JetBrains Mono',monospace}}
</style>
</head>
<body>
<div class="box">
<div class="ring"></div>
<h1>🚀 Deploying {project.name} ({target_label})...</h1>
<p>Please don't close this tab — this page updates automatically.</p>
<div class="timer" id="timer">Elapsed: 0s</div>
</div>
<script>
let seconds = 0;
setInterval(() => {{
  seconds++;
  document.getElementById('timer').textContent = 'Elapsed: ' + seconds + 's';
}}, 1000);
</script>
</body></html>"""

    def _build_deploy_result(self, project, command, output, error, exit_status, ok, target_label):
        generated = dt.today().strftime("%d %B %Y, %I:%M %p")
        status_color = "#1a6b3a" if ok else "#c0392b"
        status_text = "✅ Deploy Succeeded" if ok else "❌ Deploy Failed"

        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Deploy – {project.name}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=JetBrains+Mono&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',sans-serif;background:#f7f9fb;color:#111}}
.bar{{background:#111;padding:16px 40px;display:flex;justify-content:space-between;align-items:center}}
.bar h1{{color:#fff;font-size:15px}}
.status{{margin:24px 40px;padding:16px 22px;border-radius:6px;background:{status_color};color:#fff;font-weight:700;font-size:15px;display:flex;justify-content:space-between}}
.meta{{margin:0 40px 20px;font-size:12px;color:#888}}
.log-box{{margin:0 40px 40px;background:#0d1117;border-radius:6px;overflow:hidden}}
.log-head{{background:#161b22;padding:8px 16px;font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:1px;font-weight:700}}
pre{{padding:18px;color:#c9d1d9;font-family:'JetBrains Mono',monospace;font-size:12.5px;white-space:pre-wrap;word-break:break-word;line-height:1.6}}
.err pre{{color:#ff7b72}}
</style>
</head>
<body>
<div class="bar"><h1>🚀 Deploy Report — {project.name} ({target_label})</h1></div>
<div class="status"><span>{status_text}</span><span>Exit code: {exit_status if exit_status is not None else "N/A"}</span></div>
<div class="meta">Command: <code>{command}</code> &nbsp;·&nbsp; Run: {generated}</div>
<div class="log-box">
  <div class="log-head">stdout</div>
  <pre>{output or '(no output)'}</pre>
</div>
<div class="log-box err">
  <div class="log-head">stderr</div>
  <pre>{error or '(no errors)'}</pre>
</div>
</body></html>"""

    def monthly_report(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)

        year_param = request.GET.get('year')
        month_param = request.GET.get('month')

        if year_param and month_param:
            try:
                year = int(year_param)
                month = int(month_param)
                import calendar
                month_name = calendar.month_name[month]
                label = f"Month: {month_name} {year}"
                timesheets = Timesheet.objects.filter(
                    project=project, date__year=year, date__month=month
                ).prefetch_related('tasks').order_by('date')
                return HttpResponse(self._build_report(project, timesheets, label, f"Monthly Timesheet Report - {month_name} {year}"))
            except (ValueError, IndexError):
                pass

        # Otherwise, show month selector selection page
        dates = Timesheet.objects.filter(project=project).dates('date', 'month', order='DESC')
        if not dates:
            from dateutil.relativedelta import relativedelta
            today = dt.today()
            dates = [today - relativedelta(months=i) for i in range(6)]

        options_html = ""
        for d in dates:
            month_name = d.strftime('%B')
            year_val = d.year
            month_val = d.month
            options_html += f"""
            <a href="?year={year_val}&month={month_val}" style="
                display: block;
                background: #f8fafc;
                border: 1px solid #e8f0f5;
                color: #111;
                padding: 14px 20px;
                margin-bottom: 12px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
                font-size: 15px;
                transition: all 0.2s ease;
                text-align: center;
                box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            " onmouseover="this.style.background='#1a6b3a';this.style.color='#fff';this.style.borderColor='#1a6b3a'"
               onmouseout="this.style.background='#f8fafc';this.style.color='#111';this.style.borderColor='#e8f0f5'">
                📅 {month_name} {year_val}
            </a>"""

        selection_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Select Month – {project.name}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',sans-serif;background:#f0f4f8;color:#111;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}}
.card{{background:#fff;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.05);width:100%;max-width:400px;padding:32px;border-top:5px solid #1a6b3a}}
h2{{font-size:20px;font-weight:700;margin-bottom:6px;color:#111;text-align:center}}
p{{font-size:13px;color:#888;margin-bottom:24px;text-align:center}}
.footer{{margin-top:20px;text-align:center;font-size:12px;color:#aaa}}
.footer a{{color:#1a6b3a;text-decoration:none;font-weight:600}}
</style>
</head>
<body>
<div class="card">
    <h2>Select Month</h2>
    <p>For project <strong>{project.name}</strong></p>
    <div style="max-height: 350px; overflow-y: auto; padding-right: 4px;">
        {options_html}
    </div>
    <div class="footer">
        <a href="../all/" style="color:#666;margin-right:15px">📋 View All</a>
        <a href="../../">← Back to Projects</a>
    </div>
</div>
</body>
</html>"""
        return HttpResponse(selection_html)

    def all_report(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)
        timesheets = Timesheet.objects.filter(
            project=project
        ).prefetch_related('tasks').order_by('date')
        label = "All Timesheets"
        return HttpResponse(self._build_report(project, timesheets, label, "Project Timesheet Report"))

    def _build_report(self, project, timesheets, period_label, report_title):
        generated = dt.today().strftime("%d %B %Y")

        ts_rows = ""
        grand_hours = 0
        grand_amount = 0
        sl = 1

        # Fetch default bank account if configured
        bank = BankAccount.objects.first()
        bank_html = ""
        if bank:
            branch_str = f" ({bank.branch})" if bank.branch else ""
            swift_str = f"<div><strong>SWIFT Code:</strong> {bank.swift_code}</div>" if bank.swift_code else ""
            bank_html = f"""
  <div style="font-size:12px;color:#555;line-height:1.6;border:1px solid #e8f0f5;border-radius:5px;padding:12px 18px;background:#fcfdfe;width:340px;text-align:left;">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#aaa;font-weight:700;margin-bottom:6px">Bank Details for Payment</div>
    <div><strong>Account Holder:</strong> {bank.name}</div>
    <div><strong>Bank Name:</strong> {bank.bank_name}{branch_str}</div>
    <div><strong>Account Number:</strong> {bank.account_number}</div>
    <div><strong>IFSC Code:</strong> {bank.ifsc_code}</div>
    {swift_str}
  </div>"""

        from collections import defaultdict
        employee_groups = defaultdict(list)
        for ts in timesheets:
            employee_groups[ts.employee_name].append(ts)

        for employee_name, ts_list in employee_groups.items():
            emp_tasks = []
            for ts in ts_list:
                for task in ts.tasks.all():
                    desc_lower = task.description.lower().strip()
                    is_merge = desc_lower.startswith("merge ") or desc_lower.startswith("merge pull request") or "merge branch" in desc_lower
                    if not is_merge:
                        emp_tasks.append((task, ts.date))
            
            if not emp_tasks:
                continue

            emp_total_hours = sum(float(task.hours) for task, _ in emp_tasks)
            emp_total_amount = sum(float(task.amount) for task, _ in emp_tasks)
            
            total_mins = round(emp_total_hours * 60)
            hrs = total_mins // 60
            mins = total_mins % 60
            time_str = f"{hrs}h {mins}m" if mins else f"{hrs}h"
            amt_fmt = '{:,.2f}'.format(emp_total_amount)
            
            grand_hours += emp_total_hours
            grand_amount += emp_total_amount
            
            task_count = len(emp_tasks)
            
            ts_rows += f"""
            <tr style="background:#f7fbfd;border-top:2px solid #e0eff7" class="emp-summary-row" data-emp-name="{employee_name}">
                <td style="padding:10px 16px;font-size:12px;color:#aaa;font-weight:700">{str(sl).zfill(2)}</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#111">{employee_name}</td>
                <td style="padding:10px 16px;font-size:13px;color:#555">All Dates</td>
                <td style="padding:10px 16px;font-size:13px;color:#555;text-align:center" class="emp-task-count" data-tasks="{task_count}">{task_count} tasks</td>
                <td style="padding:10px 16px;font-size:13px;text-align:right;font-weight:700;color:#29ABE2" class="emp-time" data-hours="{emp_total_hours}">{time_str}</td>
                <td style="padding:10px 16px;font-size:13px;text-align:right;font-weight:700;color:#111" class="emp-amount" data-amount="{emp_total_amount}">&#8377;{amt_fmt}</td>
            </tr>"""
            
            for task, commit_date in emp_tasks:
                t_mins = round(float(task.hours) * 60)
                t_hrs = t_mins // 60
                t_m = t_mins % 60
                t_time = f"{t_hrs}h {t_m}m" if t_m else f"{t_hrs}h"
                task_amt = '{:,.2f}'.format(float(task.amount))
                ts_rows += f"""
            <tr style="background:#fff" class="commit-row" data-emp-name="{employee_name}">
                <td style="padding:8px 16px;color:#ddd;font-size:11px"></td>
                <td style="padding:8px 16px;padding-left:28px;font-size:13px;color:#555;position:relative;">
                    <span style="color:#29ABE2;margin-right:6px">›</span>{task.description}
                    <button onclick="removeCommitRow(this)" class="remove-btn" title="Remove from PDF">[Remove]</button>
                </td>
                <td style="padding:8px 16px;font-size:13px;color:#555">{commit_date.strftime('%d %b %Y')}</td>
                <td></td>
                <td style="padding:8px 16px;text-align:right;font-size:12px;color:#888" class="task-time" data-hours="{task.hours}">
                    <input type="text" value="{t_time}" onchange="updateTaskTime(this)" class="time-input" />
                </td>
                <td style="padding:8px 16px;text-align:right;font-size:12px;color:#888" class="task-amount" data-amount="{task.amount}">&#8377;{task_amt}</td>
            </tr>"""
            sl += 1

        if not ts_rows:
            ts_rows = '<tr><td colspan="6" style="padding:32px;text-align:center;color:#ccc;font-size:14px">No timesheets found for this period.</td></tr>'

        total_mins_all = round(grand_hours * 60)
        hrs_all = total_mins_all // 60
        mins_all = total_mins_all % 60
        total_time = f"{hrs_all}h {mins_all}m" if mins_all else f"{hrs_all}h"
        grand_amt_fmt = '{:,.2f}'.format(grand_amount)

        return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{report_title} – {project.name}</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;600;700;800&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:'DM Sans',sans-serif;background:#fff;color:#111;font-size:14px;line-height:1.6}}
.printbar{{background:#111;padding:11px 40px;display:flex;justify-content:space-between;align-items:center}}
.printbar span{{font-size:12px;color:#666}}
.printbar button{{background:#29ABE2;color:#fff;border:none;padding:8px 22px;border-radius:5px;font-size:13px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif}}
.doc-header{{padding:28px 40px 24px;display:flex;justify-content:space-between;align-items:flex-start;position:relative;border-bottom:3px solid #29ABE2}}
.logo-text{{font-size:36px;font-weight:800;letter-spacing:2px;line-height:1;color:#111;text-transform:uppercase;position:relative;z-index:2}}
.logo-text .v{{color:#29ABE2}}
.logo-sub{{font-size:10px;text-transform:uppercase;letter-spacing:3px;color:#aaa;margin-top:2px;position:relative;z-index:2}}
.logo-addr{{font-size:11px;color:#999;margin-top:8px;line-height:1.6;position:relative;z-index:2}}
.doc-info{{text-align:right;position:relative;z-index:2;background:#fff;padding-left:20px}}
.doc-info h2{{font-size:16px;font-weight:700;color:#111;text-transform:uppercase;letter-spacing:1px}}
.doc-info p{{font-size:11px;color:#aaa;margin-top:3px}}
.period-bar{{background:#29ABE2;padding:10px 40px;display:flex;justify-content:space-between;align-items:center}}
.period-bar span{{font-size:12px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px}}
.meta{{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:2px solid #f0f5f8}}
.mc{{padding:16px 24px;border-right:1px solid #f0f5f8}}
.mc:last-child{{border-right:none}}
.ml{{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#aaa;margin-bottom:4px;font-weight:600}}
.mv{{font-size:14px;font-weight:700;color:#111}}
.sec{{background:#111;margin:28px 40px 0;padding:10px 18px;display:flex;justify-content:space-between;border-radius:5px 5px 0 0}}
.sec span{{font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:2px}}
.sec small{{font-size:11px;color:#555}}
table{{width:calc(100% - 80px);margin:0 40px;border-collapse:collapse;border:1px solid #e8f0f5;border-top:none}}
thead tr{{background:#f0f7fa}}
thead th{{padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;color:#777;border-bottom:2px solid #29ABE2}}
th.r{{text-align:right}}
th.c{{text-align:center}}
tr{{border-bottom:1px solid #f0f5f8}}
.total-bar{{margin:0 40px 40px;background:#f8fafc;color:#111;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;border:1px solid #e8f0f5;border-top:none;border-radius:0 0 5px 5px}}
.tl{{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:3px}}
.tv{{font-size:22px;font-weight:800;color:#29ABE2}}
.tv-amt{{font-size:30px;font-weight:800;color:#111}}
.sigs{{margin:0 40px;display:flex;justify-content:space-between;align-items:flex-end}}
.sig-space{{height:44px}}
.sig-line{{border-top:1px solid #ccc;padding-top:7px;font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px}}
.sig-name{{font-size:13px;font-weight:700;color:#111;margin-top:3px}}
.doc-footer{{margin:32px 40px 0;padding:14px 0;border-top:1px solid #e8f0f5;display:flex;justify-content:space-between}}
.doc-footer span{{font-size:11px;color:#bbb}}
.circuit{{position:absolute;top:0;right:200px;width:160px;height:110px;z-index:1;opacity:0.8}}
.remove-btn{{float:right;background:none;border:none;color:#e11d48;cursor:pointer;font-size:11px;font-weight:600;padding:2px 6px;margin-left:10px;border-radius:4px;display:inline-block;transition:all 0.1s ease;}}
.remove-btn:hover{{background:#fee2e2;color:#b91c1c;}}
.time-input{{background:transparent;border:none;color:#888;font-size:12px;text-align:right;width:75px;font-family:inherit;padding:2px 4px;border-bottom:1px dashed transparent;outline:none;}}
.time-input:hover{{border-bottom-color:#ddd;}}
.time-input:focus{{border-bottom-color:#29ABE2;color:#111;background:#f8fafc;}}
@media print{{.printbar, .remove-btn{{display:none!important}}}}
</style>
</head>
<body>

<div class="printbar">
  <span>{report_title} &nbsp;·&nbsp; {project.name} &nbsp;·&nbsp; {period_label}</span>
  <button onclick="window.print()">🖨&nbsp; Print / Save as PDF</button>
</div>

<div class="doc-header">
  <div>
    <div class="logo-text">TRES<span class="v">V</span>ANCE</div>
    <div class="logo-sub">Softwares</div>
    <div class="logo-addr">
      Souparnika Building, Priyadarsini Nagar 128<br>
      Kilikolloor P.O, Kollam 691500, Kerala, India<br>
      info@tresvance.com &nbsp;·&nbsp; +91 8129108139
    </div>
  </div>

  <div class="doc-info">
    <h2>{report_title}</h2>
    <p style="margin-top:6px">Generated: {generated}</p>
    <p>{period_label}</p>
    <p>Currency: INR (Indian Rupees)</p>
  </div>
</div>

<div class="period-bar">
  <span> &nbsp;{project.name}</span>
  <span>{period_label} &nbsp;·&nbsp; Rate: &#8377;{project.hourly_rate}/hr</span>
</div>

<div class="meta">
  <div class="mc"><div class="ml">Project</div><div class="mv">{project.name}</div></div>
  <div class="mc"><div class="ml">Hourly Rate</div><div class="mv">&#8377;{project.hourly_rate}/hr</div></div>
  <div class="mc"><div class="ml">Total Entries</div><div class="mv">{timesheets.count()} timesheet(s)</div></div>
  <div class="mc"><div class="ml">Total Amount</div><div class="mv" id="meta-total-amount" style="color:#1a6b3a;">&#8377;{grand_amt_fmt}</div></div>
</div>

<div class="sec">
  <span>Timesheet Details</span>
  <small>{timesheets.count()} entries</small>
</div>

<table id="timesheet-table" data-rate="{project.hourly_rate}">
  <thead>
    <tr>
      <th style="width:44px">Sl</th>
      <th>Employee</th>
      <th>Date</th>
      <th class="c">Tasks</th>
      <th class="r">Time Spent</th>
      <th class="r">Amount (&#8377;)</th>
    </tr>
  </thead>
  <tbody>{ts_rows}</tbody>
</table>

<div class="total-bar">
  <div>
    <div class="tl">Total Time Spent</div>
    <div class="tv" id="grand-total-time" data-hours="{grand_hours}">{total_time}</div>
  </div>
  <div style="text-align:right">
    <div class="tl">Total Amount Billable</div>
    <div class="tv-amt" id="grand-total-amount" data-amount="{grand_amount}">&#8377;{grand_amt_fmt}</div>
  </div>
</div>

<div class="sigs">
  {bank_html}
  <div style="width:180px;text-align:right">
    <div style="height:85px;display:flex;justify-content:flex-end;align-items:center;margin-bottom:6px">
      <img src="/static/home/seal.png" alt="Seal" style="height:80px;width:80px;" />
    </div>
    <div class="sig-line" style="text-align:right">Prepared by</div>
    <div class="sig-name" style="text-align:right">Tresvance Softwares</div>
  </div>
</div>

<div class="doc-footer">
  <span>tresvance.com &nbsp;·&nbsp; info@tresvance.com &nbsp;·&nbsp; +91 8129108139</span>
  <span>System-generated report &nbsp;·&nbsp; {generated}</span>
</div>

<script>
function parseTimeToHours(str) {{
    str = str.toLowerCase().trim();
    if (!str) return 0;
    
    let hours = 0;
    let mins = 0;
    
    if (str.includes('h') || str.includes('m')) {{
        const hMatch = str.match(/(\d+\.?\d*)\s*h/);
        const mMatch = str.match(/(\d+\.?\d*)\s*m/);
        
        if (hMatch) hours = parseFloat(hMatch[1]) || 0;
        if (mMatch) mins = parseFloat(mMatch[1]) || 0;
        
        if (!hMatch && !mMatch) {{
            const val = parseFloat(str) || 0;
            if (str.endsWith('m')) return val / 60;
            return val;
        }}
        return hours + (mins / 60);
    }}
    
    return parseFloat(str) || 0;
}}

function updateTaskTime(input) {{
    const row = input.closest('tr');
    const cell = input.parentElement;
    const empName = row.getAttribute('data-emp-name');
    
    const rawVal = input.value;
    const newHours = parseTimeToHours(rawVal);
    
    const oldHours = parseFloat(cell.getAttribute('data-hours')) || 0;
    const diffHours = newHours - oldHours;
    
    const table = document.getElementById('timesheet-table');
    const hourlyRate = parseFloat(table.getAttribute('data-rate')) || 0;
    const newAmount = newHours * hourlyRate;
    
    const amtCell = row.querySelector('.task-amount');
    const oldAmount = parseFloat(amtCell.getAttribute('data-amount')) || 0;
    const diffAmount = newAmount - oldAmount;
    
    cell.setAttribute('data-hours', newHours.toFixed(2));
    amtCell.setAttribute('data-amount', newAmount.toFixed(2));
    amtCell.innerHTML = `&#8377;${{newAmount.toLocaleString('en-IN', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }})}}`;
    
    const hrsInt = Math.floor(newHours);
    const minsInt = Math.round((newHours - hrsInt) * 60);
    input.value = minsInt ? `${{hrsInt}}h ${{minsInt}}m` : `${{hrsInt}}h`;
    
    // 1. Update Employee Summary Row
    const summaryRow = document.querySelector(`.emp-summary-row[data-emp-name="${{empName}}"]`);
    if (summaryRow) {{
        const empTimeCell = summaryRow.querySelector('.emp-time');
        const empAmtCell = summaryRow.querySelector('.emp-amount');
        
        let empHours = parseFloat(empTimeCell.getAttribute('data-hours')) || 0;
        let empAmount = parseFloat(empAmtCell.getAttribute('data-amount')) || 0;
        
        empHours = Math.max(0, empHours + diffHours);
        empAmount = Math.max(0, empAmount + diffAmount);
        
        empTimeCell.setAttribute('data-hours', empHours.toFixed(2));
        empAmtCell.setAttribute('data-amount', empAmount.toFixed(2));
        
        const empHrsInt = Math.floor(empHours);
        const empMinsInt = Math.round((empHours - empHrsInt) * 60);
        empTimeCell.innerText = empMinsInt ? `${{empHrsInt}}h ${{empMinsInt}}m` : `${{empHrsInt}}h`;
        empAmtCell.innerHTML = `&#8377;${{empAmount.toLocaleString('en-IN', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }})}}`;
    }}
    
    // 2. Update Grand Totals
    const grandTimeCell = document.getElementById('grand-total-time');
    const grandAmtCell = document.getElementById('grand-total-amount');
    
    let grandHours = parseFloat(grandTimeCell.getAttribute('data-hours')) || 0;
    let grandAmount = parseFloat(grandAmtCell.getAttribute('data-amount')) || 0;
    
    grandHours = Math.max(0, grandHours + diffHours);
    grandAmount = Math.max(0, grandAmount + diffAmount);
    
    grandTimeCell.setAttribute('data-hours', grandHours.toFixed(2));
    grandAmtCell.setAttribute('data-amount', grandAmount.toFixed(2));
    
    const totalHrsInt = Math.floor(grandHours);
    const totalMinsInt = Math.round((grandHours - totalHrsInt) * 60);
    grandTimeCell.innerText = totalMinsInt ? `${{totalHrsInt}}h ${{totalMinsInt}}m` : `${{totalHrsInt}}h`;
    grandAmtCell.innerHTML = `&#8377;${{grandAmount.toLocaleString('en-IN', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }})}}`;
    
    // 3. Update Meta Grid
    const metaAmtCell = document.getElementById('meta-total-amount');
    if (metaAmtCell) {{
        metaAmtCell.innerHTML = `&#8377;${{grandAmount.toLocaleString('en-IN', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }})}}`;
    }}
}}

function removeCommitRow(btn) {{
    const row = btn.closest('tr');
    const empName = row.getAttribute('data-emp-name');
    
    const taskHours = parseFloat(row.querySelector('.task-time').getAttribute('data-hours')) || 0;
    const taskAmount = parseFloat(row.querySelector('.task-amount').getAttribute('data-amount')) || 0;
    
    // 1. Update Employee Summary Row
    const summaryRow = document.querySelector(`.emp-summary-row[data-emp-name="${{empName}}"]`);
    if (summaryRow) {{
        const empTimeCell = summaryRow.querySelector('.emp-time');
        const empAmtCell = summaryRow.querySelector('.emp-amount');
        const empTaskCountCell = summaryRow.querySelector('.emp-task-count');
        
        let empHours = parseFloat(empTimeCell.getAttribute('data-hours')) || 0;
        let empAmount = parseFloat(empAmtCell.getAttribute('data-amount')) || 0;
        let empTasksCount = parseInt(empTaskCountCell.getAttribute('data-tasks')) || 0;
        
        empHours = Math.max(0, empHours - taskHours);
        empAmount = Math.max(0, empAmount - taskAmount);
        empTasksCount = Math.max(0, empTasksCount - 1);
        
        empTimeCell.setAttribute('data-hours', empHours.toFixed(2));
        empAmtCell.setAttribute('data-amount', empAmount.toFixed(2));
        empTaskCountCell.setAttribute('data-tasks', empTasksCount);
        
        const hrsInt = Math.floor(empHours);
        const minsInt = Math.round((empHours - hrsInt) * 60);
        const timeStr = minsInt ? `${{hrsInt}}h ${{minsInt}}m` : `${{hrsInt}}h`;
        
        empTimeCell.innerText = timeStr;
        empAmtCell.innerHTML = `&#8377;${{empAmount.toLocaleString('en-IN', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }})}}`;
        empTaskCountCell.innerText = `${{empTasksCount}} task${{empTasksCount !== 1 ? 's' : ''}}`;
        
        if (empTasksCount === 0) {{
            summaryRow.remove();
        }}
    }}
    
    // 2. Update Grand Totals
    const grandTimeCell = document.getElementById('grand-total-time');
    const grandAmtCell = document.getElementById('grand-total-amount');
    
    let grandHours = parseFloat(grandTimeCell.getAttribute('data-hours')) || 0;
    let grandAmount = parseFloat(grandAmtCell.getAttribute('data-amount')) || 0;
    
    grandHours = Math.max(0, grandHours - taskHours);
    grandAmount = Math.max(0, grandAmount - taskAmount);
    
    grandTimeCell.setAttribute('data-hours', grandHours.toFixed(2));
    grandAmtCell.setAttribute('data-amount', grandAmount.toFixed(2));
    
    const grandHrsInt = Math.floor(grandHours);
    const grandMinsInt = Math.round((grandHours - grandHrsInt) * 60);
    const grandTimeStr = grandMinsInt ? `${{grandHrsInt}}h ${{grandMinsInt}}m` : `${{grandHrsInt}}h`;
    
    grandTimeCell.innerText = grandTimeStr;
    grandAmtCell.innerHTML = `&#8377;${{grandAmount.toLocaleString('en-IN', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }})}}`;
    
    // 3. Update Meta Grid
    const metaAmtCell = document.getElementById('meta-total-amount');
    if (metaAmtCell) {{
        metaAmtCell.innerHTML = `&#8377;${{grandAmount.toLocaleString('en-IN', {{ minimumFractionDigits: 2, maximumFractionDigits: 2 }})}}`;
    }}
    
    // 4. Remove row
    row.remove();
}}
</script>

</body></html>"""


# ── Timesheet Admin ────────────────────────────────────────────────────────────
class TimesheetTaskInline(admin.TabularInline):
    model = TimesheetTask
    extra = 0
    readonly_fields = ('amount',)
    fields = ('description', 'hours', 'amount')
    can_delete = False


@admin.register(Timesheet)
class TimesheetAdmin(admin.ModelAdmin):
    list_display = ('employee_name', 'project', 'date', 'total_hours', 'hourly_rate_display', 'total_amount_display', 'submitted_at')
    list_filter = ('project', 'date', 'employee_name')
    search_fields = ('employee_name', 'project__name')
    readonly_fields = ('total_hours', 'total_amount', 'hourly_rate', 'submitted_at')
    inlines = [TimesheetTaskInline]
    date_hierarchy = 'date'
    fieldsets = (
        ('Employee', {'fields': ('employee_name', 'date')}),
        ('Project & Billing', {'fields': ('project', 'hourly_rate')}),
        ('Totals', {'fields': ('total_hours', 'total_amount', 'submitted_at')}),
    )

    def hourly_rate_display(self, obj):
        return format_html('₹{}/hr', obj.hourly_rate)
    hourly_rate_display.short_description = 'Rate'

    def total_amount_display(self, obj):
        amount = '{:,.2f}'.format(obj.total_amount)
        return format_html('<strong style="color:#1a6b3a;">₹{}</strong>', amount)
    total_amount_display.short_description = 'Amount'
    total_amount_display.admin_order_field = 'total_amount'


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ('name', 'bank_name', 'branch', 'account_number', 'ifsc_code', 'swift_code')
    search_fields = ('name', 'bank_name', 'branch', 'account_number')


@admin.register(AdminLogin)
class AdminLoginAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'password')
    search_fields = ('name', 'email')
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'assigned_to', 'priority', 'status', 'due_date')
    list_filter = ('project', 'priority', 'status', 'due_date')
    search_fields = ('name', 'description', 'assigned_to')




admin.site.site_header = mark_safe(
    'Tresvance Softwares Admin <a href="/" target="_blank" style="display: inline-block; vertical-align: middle; margin-left: 20px; background: #29ABE2; color: #fff; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; text-decoration: none; border: 1.5px solid #29ABE2; transition: all 0.2s;">💻 Open PM Portal</a>'
)
admin.site.site_title = "Tresvance Admin Portal"
admin.site.index_title = "Project Tracker Admin"