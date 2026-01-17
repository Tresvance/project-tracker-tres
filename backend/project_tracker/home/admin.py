from django.contrib import admin
from .models import Project

# Register the Project model
@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'mode', 'url', 'version', 'remarks')
    search_fields = ('name', 'mode', 'version')
