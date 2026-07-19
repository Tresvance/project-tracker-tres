from django.db import models



class DeployScript(models.Model):
    project = models.ForeignKey(
        "Project", on_delete=models.CASCADE, related_name="deploy_scripts"
    )
    label = models.CharField(
        max_length=100,
        help_text='Short name, e.g. "Full deploy (web+admin)" or "Frontend only"',
    )
    command = models.CharField(
        max_length=500,
        help_text='Shell command to run, e.g. "bash /opt/Qpet/deploy_simple.sh"',
    )

    def __str__(self):
        return self.label

    class Meta:
        ordering = ["id"]


class Project(models.Model):
    MODE_CHOICES = [("DEV", "Development"), ("PROD", "Production"), ("MAINT", "Maintenance")]

    name        = models.CharField(max_length=200)
    mode        = models.CharField(max_length=10, choices=MODE_CHOICES, default="DEV")
    version     = models.CharField(max_length=50, blank=True)
    url         = models.URLField(blank=True)
    remarks     = models.TextField(blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    test_deploy_command = models.CharField(
        max_length=500,
        blank=True,
        help_text='Shell command to run on the VPS to deploy to the TEST server. '
                   'e.g. "cd /opt/Qpet-test && ./deploy_qpet_test.sh". Leave blank to hide the Test Deploy button.',
    )

    deploy_command = models.CharField(
        max_length=500,
        blank=True,
        help_text='Shell command to run on the VPS to deploy this project. '
                   'e.g. "cd /opt/Qpet && ./deploy_qpet.sh". Leave blank to hide the Deploy button.',
    )


    active_deploy_script = models.ForeignKey(
        DeployScript,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="Pick which deploy script runs when the Deploy button is clicked.",
    )

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]

    # ── GitHub integration ──────────────────────────────────────────────────
    github_repo = models.CharField(
        max_length=200,
        blank=True,
        help_text='GitHub repo in "owner/repo" format, e.g. myorg/myrepo',
    )
    # Tiered churn thresholds (lines changed → hours)
    churn_tiny   = models.PositiveIntegerField(default=30,  help_text="Lines ≤ this → 0.17 hrs (10 mins) (tiny commit)")
    churn_small  = models.PositiveIntegerField(default=100, help_text="Lines ≤ this → 0.25 hrs (15 mins) (small commit)")
    churn_medium = models.PositiveIntegerField(default=300, help_text="Lines ≤ this → 1.5 hrs  (medium commit)")
    churn_large  = models.PositiveIntegerField(default=600, help_text="Lines ≤ this → 3.0 hrs  (large commit)")
    # Anything above churn_large → 6.0 hrs (huge commit)

    def churn_to_hours(self, churn: int) -> float:
        """Convert lines-changed count to estimated hours using project thresholds."""
        if churn <= self.churn_tiny:   return 0.17  # 10 min
        if churn <= self.churn_small:  return 0.25  # 15 min
        if churn <= self.churn_medium: return 1.5
        if churn <= self.churn_large:  return 3.0
        return 6.0

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["name"]


class Timesheet(models.Model):
    SOURCE_CHOICES = [("MANUAL", "Manual"), ("GITHUB_COMMIT", "GitHub Commit"), ("GITHUB_PR", "GitHub PR Merge")]

    project       = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="timesheets")
    employee_name = models.CharField(max_length=100)
    date          = models.DateField()
    hourly_rate   = models.DecimalField(max_digits=10, decimal_places=2)
    total_hours   = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    total_amount  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    submitted_at  = models.DateTimeField(auto_now_add=True)

    # ── GitHub metadata ─────────────────────────────────────────────────────
    source        = models.CharField(max_length=20, choices=SOURCE_CHOICES, default="MANUAL")
    github_sha    = models.CharField(max_length=40, blank=True, help_text="Commit SHA (for commit entries)")
    github_pr_number = models.PositiveIntegerField(null=True, blank=True, help_text="PR number (for PR entries)")
    hours_overridden = models.BooleanField(default=False, help_text="Admin manually adjusted auto hours")

    def __str__(self):
        return f"{self.employee_name} — {self.project} — {self.date}"

    class Meta:
        ordering = ["-date", "-submitted_at"]


class TimesheetTask(models.Model):
    timesheet   = models.ForeignKey(Timesheet, on_delete=models.CASCADE, related_name="tasks")
    description = models.TextField()
    hours       = models.DecimalField(max_digits=6, decimal_places=2)
    amount      = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return self.description[:60]