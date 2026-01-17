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

    def __str__(self):
        return self.name
