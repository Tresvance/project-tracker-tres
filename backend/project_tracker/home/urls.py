from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TimesheetViewSet, github_webhook, show_logs

router = DefaultRouter()
router.register(r'home', ProjectViewSet)
router.register(r'timesheets', TimesheetViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('github-webhook/', github_webhook, name='github-webhook'),
    path('show-logs/', show_logs, name='show-logs'),
]