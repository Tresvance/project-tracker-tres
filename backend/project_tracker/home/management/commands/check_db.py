from django.core.management.base import BaseCommand
from home.models import Timesheet, TimesheetTask
import sqlite3
from django.conf import settings
from decimal import Decimal

class Command(BaseCommand):
    help = 'Check and print any invalid decimal values in database'

    def handle(self, *args, **options):
        db_path = settings.DATABASES['default']['NAME']
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        self.stdout.write("Checking home_timesheet table...")
        cursor.execute("SELECT id, total_hours, total_amount, hourly_rate FROM home_timesheet")
        for row in cursor.fetchall():
            tid, th, ta, hr = row
            for val, name in [(th, 'total_hours'), (ta, 'total_amount'), (hr, 'hourly_rate')]:
                if val is not None:
                    try:
                        Decimal(str(val))
                    except Exception:
                        self.stdout.write(self.style.ERROR(f"Timesheet ID {tid} has invalid {name}: {repr(val)}"))
                        
        self.stdout.write("Checking home_timesheettask table...")
        cursor.execute("SELECT id, hours, amount, timesheet_id FROM home_timesheettask")
        for row in cursor.fetchall():
            tid, h, a, ts_id = row
            for val, name in [(h, 'hours'), (a, 'amount')]:
                if val is not None:
                    try:
                        Decimal(str(val))
                    except Exception:
                        self.stdout.write(self.style.ERROR(f"TimesheetTask ID {tid} (under Timesheet {ts_id}) has invalid {name}: {repr(val)}"))
        self.stdout.write(self.style.SUCCESS("Check completed!"))
