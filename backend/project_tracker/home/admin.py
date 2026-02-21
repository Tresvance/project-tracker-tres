from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum
from django.http import HttpResponse
from django.urls import path
from datetime import date as dt, timedelta
from .models import Project, Timesheet, TimesheetTask


# ── Project Admin ──────────────────────────────────────────────────────────────
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'mode', 'version', 'hourly_rate_display', 'total_timesheets', 'total_hours_logged', 'total_billed', 'report_buttons')
    list_filter = ('mode',)
    search_fields = ('name', 'remarks')
    fieldsets = (
        ('Project Info', {'fields': ('name', 'mode', 'version', 'url', 'remarks')}),
        ('Billing Rate', {
            'fields': ('hourly_rate',),
            'description': '⚙️ Set the hourly rate (₹) for this project. Employees will NOT see this rate.'
        }),
    )

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('<int:project_id>/report/weekly/', self.admin_site.admin_view(self.weekly_report), name='project_weekly_report'),
            path('<int:project_id>/report/monthly/', self.admin_site.admin_view(self.monthly_report), name='project_monthly_report'),
            path('<int:project_id>/report/all/', self.admin_site.admin_view(self.all_report), name='project_all_report'),
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
        return format_html(
            '<div style="display:flex;gap:6px;">'
            '<a href="{}/report/weekly/" target="_blank" style="background:#29ABE2;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">📅 Weekly</a>'
            '<a href="{}/report/monthly/" target="_blank" style="background:#1a6b3a;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">📆 Monthly</a>'
            '<a href="{}/report/all/" target="_blank" style="background:#111;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none;font-size:11px;font-weight:700;white-space:nowrap;">📋 All</a>'
            '</div>',
            obj.pk, obj.pk, obj.pk
        )
    report_buttons.short_description = 'Reports'

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
        month_start = today.replace(day=1)
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
        generated = dt.today().strftime("%d %B %Y")

        # Build timesheet rows grouped by employee/date
        ts_rows = ""
        grand_hours = 0
        grand_amount = 0
        sl = 1

        for ts in timesheets:
            tasks = ts.tasks.all()
            task_count = tasks.count()
            total_mins = round(float(ts.total_hours) * 60)
            hrs = total_mins // 60
            mins = total_mins % 60
            time_str = f"{hrs}h {mins}m" if mins else f"{hrs}h"
            amt = float(ts.total_amount)
            amt_fmt = '{:,.2f}'.format(amt)
            grand_hours += float(ts.total_hours)
            grand_amount += amt

            # First row with employee name
            ts_rows += f"""
            <tr style="background:#f7fbfd;border-top:2px solid #e0eff7">
                <td style="padding:10px 16px;font-size:12px;color:#aaa;font-weight:700">{str(sl).zfill(2)}</td>
                <td style="padding:10px 16px;font-size:13px;font-weight:700;color:#111">{ts.employee_name}</td>
                <td style="padding:10px 16px;font-size:13px;color:#555">{ts.date.strftime('%d %b %Y')}</td>
                <td style="padding:10px 16px;font-size:13px;color:#555;text-align:center">{task_count} tasks</td>
                <td style="padding:10px 16px;font-size:13px;text-align:right;font-weight:700;color:#29ABE2">{time_str}</td>
                <td style="padding:10px 16px;font-size:13px;text-align:right;font-weight:700;color:#111">&#8377;{amt_fmt}</td>
            </tr>"""

            # Task detail rows
            for task in tasks:
                t_mins = round(float(task.hours) * 60)
                t_hrs = t_mins // 60
                t_m = t_mins % 60
                t_time = f"{t_hrs}h {t_m}m" if t_m else f"{t_hrs}h"
                task_amt = '{:,.2f}'.format(float(task.amount))
                ts_rows += f"""
            <tr style="background:#fff">
                <td style="padding:8px 16px;color:#ddd;font-size:11px"></td>
                <td style="padding:8px 16px;padding-left:28px;font-size:13px;color:#555" colspan="2">
                    <span style="color:#29ABE2;margin-right:6px">›</span>{task.description}
                </td>
                <td></td>
                <td style="padding:8px 16px;text-align:right;font-size:12px;color:#888">{t_time}</td>
                <td style="padding:8px 16px;text-align:right;font-size:12px;color:#888">&#8377;{task_amt}</td>
            </tr>"""
            sl += 1

        if not ts_rows:
            ts_rows = '<tr><td colspan="6" style="padding:32px;text-align:center;color:#ccc;font-size:14px">No timesheets found for this period.</td></tr>'

        # Grand totals
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
.total-bar{{margin:0 40px 40px;background:#111;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center;border-radius:0 0 5px 5px}}
.tl{{font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#666;margin-bottom:3px}}
.tv{{font-size:22px;font-weight:800;color:#29ABE2}}
.tv-amt{{font-size:30px;font-weight:800;color:#fff}}
.sigs{{margin:0 40px;display:flex;justify-content:space-between}}
.sig-space{{height:44px}}
.sig-line{{border-top:1px solid #ccc;padding-top:7px;font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:1px}}
.sig-name{{font-size:13px;font-weight:700;color:#111;margin-top:3px}}
.doc-footer{{margin:32px 40px 0;padding:14px 0;border-top:1px solid #e8f0f5;display:flex;justify-content:space-between}}
.doc-footer span{{font-size:11px;color:#bbb}}
.circuit{{position:absolute;top:0;right:200px;width:160px;height:110px;z-index:1;opacity:0.8}}
@media print{{.printbar{{display:none!important}}}}
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
  <div class="mc"><div class="ml">Mode</div><div class="mv">{project.mode}</div></div>
  <div class="mc"><div class="ml">Hourly Rate</div><div class="mv">&#8377;{project.hourly_rate}/hr</div></div>
  <div class="mc"><div class="ml">Total Entries</div><div class="mv">{timesheets.count()} timesheet(s)</div></div>
</div>

<div class="sec">
  <span>Timesheet Details</span>
  <small>{timesheets.count()} entries</small>
</div>

<table>
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
    <div class="tv">{total_time}</div>
  </div>
  <div style="text-align:right">
    <div class="tl">Total Amount Billable</div>
    <div class="tv-amt">&#8377;{grand_amt_fmt}</div>
  </div>
</div>

<div class="sigs">
  <div style="width:180px"><div class="sig-space"></div><div class="sig-line">Prepared by</div><div class="sig-name">Tresvance Softwares</div></div>
  <div style="width:180px"><div class="sig-space"></div><div class="sig-line">Client Approval</div><div class="sig-name">&nbsp;</div></div>
</div>

<div class="doc-footer">
  <span>tresvance.com &nbsp;·&nbsp; info@tresvance.com &nbsp;·&nbsp; +91 8129108139</span>
  <span>System-generated report &nbsp;·&nbsp; {generated}</span>
</div>

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