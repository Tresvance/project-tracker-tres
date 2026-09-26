from django.db import models
from datetime import date as dt



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
    interactive = models.BooleanField(
        default=False,
        help_text='Check if this script is interactive and requires parameters (branch, services, migrations) to be asked before executing.'
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
    is_visible_in_list = models.BooleanField(
        default=True,
        verbose_name="Visible in Project List",
        help_text="Show this project on the frontend project list page."
    )
    url         = models.URLField(blank=True)
    links       = models.JSONField(
        default=list,
        blank=True,
        help_text="Multiple links such as Test Server, Development Link, Production, etc. Format: [{'title': '...', 'url': '...', 'env': 'test'}]"
    )
    remarks     = models.TextField(blank=True)
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    test_deploy_command = models.CharField(
        max_length=500,
        blank=True,
        help_text='Shell command to run on the VPS to deploy to the TEST server. '
                   'e.g. "cd /opt/Qpet-test && ./deploy_qpet_test.sh". Leave blank to hide the Test Deploy button.',
    )
    test_deploy_interactive = models.BooleanField(
        default=False,
        help_text='Check if the test deploy command is interactive and requires parameters (branch, services, migrations) to be asked.'
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
        """Convert lines-changed count to estimated hours: 20 seconds per line (capped at 8.0 hours)."""
        hours = (churn * 20) / 3600
        return round(min(hours, 8.0), 2)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_rate = None
        if not is_new:
            try:
                old_rate = Project.objects.get(pk=self.pk).hourly_rate
            except Project.DoesNotExist:
                pass
                
        if not self.url and self.links and isinstance(self.links, list) and len(self.links) > 0:
            first_url = self.links[0].get('url') if isinstance(self.links[0], dict) else None
            if first_url:
                self.url = first_url
        elif self.url and (not self.links or len(self.links) == 0):
            self.links = [{'title': 'Production', 'url': self.url, 'env': 'prod'}]

        super().save(*args, **kwargs)
        
        if old_rate is not None and old_rate != self.hourly_rate:
            # Hourly rate changed! Update all associated timesheets and tasks in bulk
            self.timesheets.all().update(hourly_rate=self.hourly_rate)
            
            from django.db.models import F
            TimesheetTask.objects.filter(timesheet__project=self).update(
                amount=F('hours') * self.hourly_rate
            )
            
            # Recalculate timesheet totals in bulk
            self.timesheets.all().update(
                total_amount=F('total_hours') * self.hourly_rate
            )

    class Meta:
        ordering = ["name"]


class ProjectLink(models.Model):
    ENV_CHOICES = [
        ("prod", "Production (Live)"),
        ("test", "Test Server"),
        ("dev", "Development"),
        ("staging", "Staging"),
        ("other", "Other / Custom"),
    ]

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name="project_links"
    )
    env = models.CharField(
        max_length=20,
        choices=ENV_CHOICES,
        default="test",
        verbose_name="Environment",
        help_text="Environment type for badge styling (e.g. Test, Dev, Production)",
    )
    title = models.CharField(
        max_length=150,
        help_text='Display name, e.g. "Live / Production", "Test Server", "Development"',
    )
    url = models.URLField(
        max_length=500,
        help_text="Target URL, e.g. https://test.bmce.ac.in/",
    )
    remarks = models.CharField(
        max_length=300,
        blank=True,
        verbose_name="Remarks / Notes",
        help_text='Remarks / notes for this link, e.g. "QA testing build v2.4", "Local port 3000"',
    )

    class Meta:
        ordering = ["id"]
        verbose_name = "Project Environment Link"
        verbose_name_plural = "Project Environments & Links"

    def __str__(self):
        return f"{self.project.name} - {self.title} ({self.get_env_display()})"


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

    def save(self, *args, **kwargs):
        if not self.hourly_rate and self.project:
            self.hourly_rate = self.project.hourly_rate
        super().save(*args, **kwargs)

    class Meta:
        ordering = ["-date", "-submitted_at"]


class TimesheetTask(models.Model):
    timesheet   = models.ForeignKey(Timesheet, on_delete=models.CASCADE, related_name="tasks")
    description = models.TextField()
    hours       = models.DecimalField(max_digits=6, decimal_places=2)
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    github_sha  = models.CharField(max_length=40, blank=True, help_text="Commit SHA")

    def __str__(self):
        return self.description[:60]

    def save(self, *args, **kwargs):
        # Calculate amount based on hours and timesheet's hourly rate
        rate = self.timesheet.hourly_rate if self.timesheet else 0
        self.amount = round(float(self.hours) * float(rate), 2)
        super().save(*args, **kwargs)
        
        # Recalculate totals on parent timesheet
        if self.timesheet:
            from django.db.models import Sum
            totals = self.timesheet.tasks.aggregate(total_h=Sum('hours'), total_a=Sum('amount'))
            self.timesheet.total_hours = totals['total_h'] or 0
            self.timesheet.total_amount = totals['total_a'] or 0
            self.timesheet.save(update_fields=['total_hours', 'total_amount'])

    def delete(self, *args, **kwargs):
        timesheet = self.timesheet
        super().delete(*args, **kwargs)
        if timesheet:
            from django.db.models import Sum
            totals = timesheet.tasks.aggregate(total_h=Sum('hours'), total_a=Sum('amount'))
            timesheet.total_hours = totals['total_h'] or 0
            timesheet.total_amount = totals['total_a'] or 0
            timesheet.save(update_fields=['total_hours', 'total_amount'])


class BankAccount(models.Model):
    name           = models.CharField(max_length=150, verbose_name="Account Holder Name")
    bank_name      = models.CharField(max_length=150, verbose_name="Bank Name")
    branch         = models.CharField(max_length=150, blank=True, verbose_name="Branch Name")
    account_number = models.CharField(max_length=50, verbose_name="Account Number")
    ifsc_code      = models.CharField(max_length=20, verbose_name="IFSC Code")
    swift_code     = models.CharField(max_length=20, blank=True, verbose_name="SWIFT Code")

    def __str__(self):
        return f"{self.name} — {self.bank_name}"

    class Meta:
        ordering = ["name"]
        verbose_name = "Bank Account"
        verbose_name_plural = "Bank Accounts"


class AdminLogin(models.Model):
    name = models.CharField(max_length=150, default="Jibin Jose")
    email = models.EmailField(unique=True, default="jibin@tresvance.com")
    password = models.CharField(max_length=128)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "Admin Login"
        verbose_name_plural = "Admin Logins"


class Task(models.Model):
    PRIORITY_CHOICES = [
        ("Low", "Low"),
        ("Medium", "Medium"),
        ("High", "High"),
        ("Critical", "Critical"),
    ]
    STATUS_CHOICES = [
        ("To Do", "To Do"),
        ("In Progress", "In Progress"),
        ("Testing", "Testing"),
        ("Completed", "Completed"),
    ]

    name = models.CharField(max_length=250)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks_list")
    milestone = models.CharField(max_length=150, blank=True)
    description = models.TextField(blank=True)
    checklist = models.JSONField(default=list, blank=True)
    assigned_to = models.CharField(max_length=150)
    assigned_by = models.CharField(max_length=150, default="Jibin Jose")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="Low")
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="To Do")
    tags = models.JSONField(default=list, blank=True)
    actual_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    comments = models.JSONField(default=list, blank=True)
    activity_log = models.JSONField(default=list, blank=True)
    attachments = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Task"
        verbose_name_plural = "Tasks"


class ChangeRequest(models.Model):
    STATUS_CHOICES = [
        ("Draft", "Draft"),
        ("Shared with Client", "Shared with Client"),
        ("Client Approved", "Client Approved"),
        ("In Development", "In Development"),
        ("Completed", "Completed"),
        ("Rejected", "Rejected"),
    ]
    PRIORITY_CHOICES = [
        ("Low", "Low"),
        ("Medium", "Medium"),
        ("High", "High"),
        ("Critical", "Critical"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="change_requests")
    title = models.CharField(max_length=250, blank=True, help_text="Optional summary title")
    client_name = models.CharField(max_length=150, help_text="Client Organization / Company Name")
    client_email = models.EmailField(blank=True, help_text="Client contact email")
    requested_by_contact = models.CharField(max_length=150, blank=True, help_text="Client contact person name")
    request_date = models.DateField(default=dt.today, help_text="Date request was submitted by client")
    
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="Draft")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="Medium")
    assigned_developer = models.CharField(max_length=150, blank=True, help_text="Developer or team member assigned")
    
    description = models.TextField(help_text="Detailed description of changes requested by the client")
    technical_scope = models.TextField(blank=True, help_text="Developer technical implementation scope and notes")
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0, help_text="Estimated development effort in hours")
    target_completion_date = models.DateField(null=True, blank=True, help_text="Target completion date for development")
    
    client_approved_by = models.CharField(max_length=150, blank=True, help_text="Name of person approving from client side")
    client_approval_date = models.DateField(null=True, blank=True, help_text="Date approved by client")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.title and self.description:
            first_line = self.description.strip().split('\n')[0]
            self.title = first_line[:100]
        elif not self.title:
            self.title = "Client Change Request"
        super().save(*args, **kwargs)

    def __str__(self):
        ref_code = f"TRES-CR-{self.pk:04d}" if self.pk else "TRES-CR-NEW"
        return f"{ref_code} — {self.client_name}"

    class Meta:
        ordering = ["-request_date", "-created_at"]
        verbose_name = "Change Request"
        verbose_name_plural = "Change Requests"


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

@receiver([post_save, post_delete], sender=ProjectLink)
def sync_project_links_field(sender, instance, **kwargs):
    project = instance.project
    all_links = project.project_links.all().order_by('id')
    serialized = [
        {
            'title': l.title,
            'url': l.url,
            'env': l.env,
            'note': l.remarks,
            'remarks': l.remarks,
        }
        for l in all_links
    ]
    Project.objects.filter(pk=project.pk).update(links=serialized)


class ClientBill(models.Model):
    CATEGORY_CHOICES = [
        ("HOSTING", "Hosting & Cloud Server"),
        ("DOMAIN", "Domain Registration / Renewal"),
        ("DATABASE", "Database & Storage"),
        ("EMAIL_SMS", "Email, SMS & WhatsApp API"),
        ("SSL_SECURITY", "SSL, WAF & Security"),
        ("SOFTWARE_LICENSE", "Software & Tool License"),
        ("API_AI", "API & AI Model Usage"),
        ("MAINTENANCE", "Maintenance & Infrastructure"),
        ("OTHER", "Other Platform Expense"),
    ]

    BILLING_CYCLE_CHOICES = [
        ("MONTHLY", "Monthly (Recurring)"),
        ("YEARLY", "Yearly / Annual (Recurring)"),
        ("QUARTERLY", "Quarterly (Every 3 months)"),
        ("SEMI_ANNUAL", "Semi-Annual (Every 6 months)"),
        ("ONE_TIME", "One-Time (Fixed Expense)"),
    ]

    STATUS_CHOICES = [
        ("PAID", "Paid"),
        ("PENDING", "Payment Pending"),
        ("OVERDUE", "Overdue"),
        ("RENEWED", "Renewed"),
        ("CANCELLED", "Cancelled / Expired"),
    ]

    CURRENCY_CHOICES = [
        ("INR", "INR (₹)"),
        ("USD", "USD ($)"),
        ("EUR", "EUR (€)"),
        ("GBP", "GBP (£)"),
        ("AED", "AED"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_bills",
        verbose_name="Associated Project",
        help_text="Project associated with this hosting/platform bill (or leave blank if company-wide)"
    )
    service_name = models.CharField(
        max_length=150,
        verbose_name="Service / Item Name",
        help_text='e.g. AWS EC2 t3.large, DigitalOcean Droplet, Vercel Pro, Namecheap .com domain'
    )
    provider = models.CharField(
        max_length=100,
        verbose_name="Platform / Provider",
        help_text='e.g. AWS, DigitalOcean, Hostinger, Vercel, Namecheap, Cloudflare, OpenAI, Twilio'
    )
    category = models.CharField(
        max_length=40,
        choices=CATEGORY_CHOICES,
        default="HOSTING",
        verbose_name="Category"
    )
    billing_cycle = models.CharField(
        max_length=30,
        choices=BILLING_CYCLE_CHOICES,
        default="MONTHLY",
        verbose_name="Billing Cycle"
    )
    cost_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        verbose_name="Vendor Cost (Expense)",
        help_text="Amount paid to vendor/platform (what company pays)"
    )
    client_charge_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        verbose_name="Client Billed Amount",
        help_text="Amount billed to client. If included in retainer or unbilled, leave 0"
    )
    currency = models.CharField(
        max_length=10,
        choices=CURRENCY_CHOICES,
        default="INR",
        verbose_name="Currency"
    )
    billing_date = models.DateField(
        verbose_name="Billing / Invoice Date",
        help_text="Date invoice was generated or period started"
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Due / Renewal Date",
        help_text="Expiration or next scheduled renewal date"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="PAID",
        verbose_name="Payment Status"
    )
    paid_by = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Paid By / Method",
        help_text="e.g. Company Card, Client Card, Bank Transfer, PayPal, Joel"
    )
    invoice_ref = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Invoice # / Reference",
        help_text="Vendor invoice or transaction reference ID"
    )
    invoice_url = models.URLField(
        max_length=500,
        blank=True,
        verbose_name="Invoice URL / Receipt Link",
        help_text="Direct link to invoice PDF, receipt, or portal bill"
    )
    remarks = models.TextField(
        blank=True,
        verbose_name="Remarks / Server Specs / Notes",
        help_text="Server IP, specifications, renewal details, or client billing terms"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-due_date", "-billing_date", "-id"]
        verbose_name = "Client Bill / Platform Expense"
        verbose_name_plural = "Client Bills & Platform Expenses"

    def __str__(self):
        proj_str = self.project.name if self.project else "Company Wide"
        return f"[{proj_str}] {self.service_name} ({self.provider}) - {self.currency} {self.cost_amount}"

    @property
    def margin(self):
        return (self.client_charge_amount or 0) - (self.cost_amount or 0)

    @property
    def margin_percentage(self):
        charge = float(self.client_charge_amount or 0)
        cost = float(self.cost_amount or 0)
        if charge > 0:
            return round(((charge - cost) / charge) * 100, 1)
        return 0.0

    @property
    def monthly_cost_normalized(self):
        cost = float(self.cost_amount or 0)
        if self.billing_cycle == "YEARLY":
            return cost / 12.0
        elif self.billing_cycle == "QUARTERLY":
            return cost / 3.0
        elif self.billing_cycle == "SEMI_ANNUAL":
            return cost / 6.0
        elif self.billing_cycle == "MONTHLY":
            return cost
        elif self.billing_cycle == "ONE_TIME":
            return 0.0
        return cost
