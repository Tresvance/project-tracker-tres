from django import forms
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from django.http import HttpResponse
from django.urls import path
from django.conf import settings
from datetime import date as dt, timedelta
import paramiko
from .models import Project, Timesheet, TimesheetTask, DeployScript




import threading
from django.core.cache import cache

# ── Deploy ───────────────────────────────────────────────────────────────
def deploy_project(self, request, project_id):
    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return HttpResponse("Project not found.", status=404)

    script = project.active_deploy_script
    if not script:
        return HttpResponse("No deploy script selected for this project.", status=400)

    cache_key = f"deploy_status_{project_id}"
    cache.set(cache_key, {"status": "running"}, timeout=900)  # 15 min safety expiry

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
            "status": "done",
            "ok": ok,
            "output": output,
            "error": error,
            "exit_status": exit_status,
            "command": script.command,
        }, timeout=900)

    threading.Thread(target=run_deploy, daemon=True).start()

    return HttpResponse(self._build_deploy_waiting(project))

def deploy_status(self, request, project_id):
    cache_key = f"deploy_status_{project_id}"
    state = cache.get(cache_key)
    project = Project.objects.get(pk=project_id)

    if not state or state.get("status") == "running":
        return HttpResponse('<script>setTimeout(()=>location.reload(), 2000)</script>Still running...')

    return HttpResponse(self._build_deploy_result(
        project, state["command"], state["output"], state["error"],
        state["exit_status"], state["ok"]
    ))

def _build_deploy_waiting(self, project):
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="2;url=/admin/home/project/{project.pk}/deploy/status/">
<title>Deploying – {project.name}</title>
<style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:sans-serif;background:#0d1117;color:#c9d1d9;display:flex;align-items:center;justify-content:center;height:100vh}}
.box{{text-align:center}}
.spinner{{width:36px;height:36px;border:4px solid #29ABE2;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
h1{{font-size:16px;font-weight:600}}
p{{font-size:12px;color:#888;margin-top:8px}}
</style>
</head>
<body>
<div class="box">
<div class="spinner"></div>
<h1>🚀 Deploying {project.name}...</h1>
<p>This page will update automatically. Please don't close this tab.</p>
</div>
</body></html>"""
# ── Deploy Script Inline (the "+ Add another" table) ───────────────────────────
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
    list_display = ('name', 'mode', 'version', 'hourly_rate_display', 'total_timesheets', 'total_hours_logged', 'total_billed', 'report_buttons')
    list_filter = ('mode',)
    search_fields = ('name', 'remarks')
    fieldsets = (
        ('Project Info', {'fields': ('name', 'mode', 'version', 'url', 'remarks')}),
        ('Billing Rate', {
            'fields': ('hourly_rate',),
            'description': '⚙️ Set the hourly rate (₹) for this project. Employees will NOT see this rate.'
        }),
        ('Deployment', {
            'fields': ('active_deploy_script',),
            'description': '🚀 Add deploy scripts below (save first if this is a new project), then pick which one runs when you click Deploy.'
        }),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('<int:project_id>/report/weekly/', self.admin_site.admin_view(self.weekly_report), name='project_weekly_report'),
            path('<int:project_id>/report/monthly/', self.admin_site.admin_view(self.monthly_report), name='project_monthly_report'),
            path('<int:project_id>/report/all/', self.admin_site.admin_view(self.all_report), name='project_all_report'),
            path('<int:project_id>/deploy/', self.admin_site.admin_view(self.deploy_project), name='project_deploy'),
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

    def report_buttons(self, obj):
        deploy_btn = ''
        if obj.active_deploy_script:
            deploy_btn = format_html(
                '<a href="{}/deploy/" target="_blank" '
                'onclick="return confirm(\'Deploy {}? This will run \\\'{}\\\' on the VPS.\');" '
                'style="background:#e2542f;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">🚀 Deploy</a>',
                obj.pk, obj.name, obj.active_deploy_script.label
            )
        return format_html(
            '<div style="display:flex;gap:6px;">'
            '<a href="{}/report/weekly/" target="_blank" style="background:#29ABE2;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">📅 Weekly</a>'
            '<a href="{}/report/monthly/" target="_blank" style="background:#1a6b3a;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">📆 Monthly</a>'
            '<a href="{}/report/all/" target="_blank" style="background:#111;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">📋 All</a>'
            '{}'
            '</div>',
            obj.pk, obj.pk, obj.pk, deploy_btn
        )
    report_buttons.short_description = 'Reports'

    # ── Deploy ───────────────────────────────────────────────────────────────
    def deploy_project(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)

        script = project.active_deploy_script
        if not script:
            return HttpResponse("No deploy script selected for this project.", status=400)

        command = script.command
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

        return HttpResponse(self._build_deploy_result(project, command, output, error, exit_status, ok))

    def _build_deploy_result(self, project, command, output, error, exit_status, ok):
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
<div class="bar"><h1>🚀 Deploy Report — {project.name}</h1></div>
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

    def weekly_report(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)
        today = dt.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        timesheets = Timesheet.objects.filter(
            project=project, date__range=[week_start, week_end]
        ).prefetch_related('tasks').order_by('date')
        label = f"Week: {week_start.strftime('%d %b')} – {week_end.strftime('%d %b %Y')}"
        return HttpResponse(self._build_report(project, timesheets, label, "Weekly Timesheet Report"))

    def monthly_report(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id)
        except Project.DoesNotExist:
            return HttpResponse("Project not found.", status=404)
        today = dt.today()
        label = f"Month: {today.strftime('%B %Y')}"
        timesheets = Timesheet.objects.filter(
            project=project, date__year=today.year, date__month=today.month
        ).prefetch_related('tasks').order_by('date')
        return HttpResponse(self._build_report(project, timesheets, label, "Monthly Timesheet Report"))

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
        # ... unchanged, keep exactly as you have it ...
        pass


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