from django.core.management.base import BaseCommand
from home.models import Project, Timesheet, TimesheetTask

class Command(BaseCommand):
    help = 'Diagnose ORM serialization errors'

    def handle(self, *args, **options):
        self.stdout.write("Loading all projects one-by-one...")
        project_ids = Project.objects.values_list('id', flat=True)
        for pid in project_ids:
            try:
                project = Project.objects.get(id=pid)
                rate = project.hourly_rate
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Project {pid} failed: {type(e).__name__}: {e}"))
                
        self.stdout.write("Loading all timesheets one-by-one...")
        ts_ids = Timesheet.objects.values_list('id', flat=True)
        for tid in ts_ids:
            try:
                ts = Timesheet.objects.get(id=tid)
                th = ts.total_hours
                ta = ts.total_amount
                hr = ts.hourly_rate
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ Timesheet {tid} failed: {type(e).__name__}: {e}"))
                
        self.stdout.write("Loading all timesheet tasks one-by-one...")
        task_ids = TimesheetTask.objects.values_list('id', flat=True)
        for tid in task_ids:
            try:
                task = TimesheetTask.objects.get(id=tid)
                h = task.hours
                a = task.amount
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"❌ TimesheetTask {tid} failed: {type(e).__name__}: {e}"))
                
        # Query raw database values for the corrupted task IDs
        self.stdout.write("Fetching raw SQLite values for corrupted tasks...")
        import sqlite3
        from django.conf import settings
        db_path = settings.DATABASES['default']['NAME']
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, hours, amount, description FROM home_timesheettask WHERE id IN (300, 301)")
        for row in cursor.fetchall():
            self.stdout.write(self.style.WARNING(f"Raw Row {row[0]}: hours={repr(row[1])} (type: {type(row[1]).__name__}), amount={repr(row[2])} (type: {type(row[2]).__name__}), description={repr(row[3])}"))
        
        self.stdout.write("Done checking.")
