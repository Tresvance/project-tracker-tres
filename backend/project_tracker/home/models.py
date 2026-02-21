from django.db import models


class Project(models.Model):
    MODE_CHOICES = [
        ('DEV', 'Development'),
        ('TEST', 'Testing'),
        ('PROD', 'Production'),
    ]

    name = models.CharField(max_length=100)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES)
    url = models.URLField()
    version = models.CharField(max_length=20)
    remarks = models.TextField(blank=True)
    hourly_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=200.00,
        help_text="Rate per hour (₹) charged for this project — set by admin"
    )

    def __str__(self):
        return f"{self.name} (₹{self.hourly_rate}/hr)"


class Timesheet(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='timesheets')
    employee_name = models.CharField(max_length=100)
    date = models.DateField()
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=200.00,
        help_text="Snapshot of project rate at time of submission")
    total_hours = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee_name} — {self.project.name} ({self.date})"

    class Meta:
        ordering = ['-date', '-submitted_at']


class TimesheetTask(models.Model):
    timesheet = models.ForeignKey(Timesheet, on_delete=models.CASCADE, related_name='tasks')
    description = models.TextField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.description[:50]} ({self.hours}hrs)"