from django.core.management.base import BaseCommand
from home.models import Project, Timesheet, TimesheetTask

class Command(BaseCommand):
    help = 'Diagnose ORM serialization errors'

    def handle(self, *args, **options):
        self.stdout.write("Loading all projects...")
        for project in Project.objects.all():
            try:
                rate = project.hourly_rate
                # Accessing name is safe
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Project {project.id} failed: {type(e).__name__}: {e}"))
                
        self.stdout.write("Loading all timesheets...")
        for ts in Timesheet.objects.all():
            try:
                th = ts.total_hours
                ta = ts.total_amount
                hr = ts.hourly_rate
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Timesheet {ts.id} failed (Project ID {ts.project_id}): {type(e).__name__}: {e}"))
                
        self.stdout.write("Loading all timesheet tasks...")
        for task in TimesheetTask.objects.all():
            try:
                h = task.hours
                a = task.amount
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ TimesheetTask {task.id} failed (under Timesheet {task.timesheet_id}): {type(e).__name__}: {e}"))
                
        self.stdout.write("Done checking.")
