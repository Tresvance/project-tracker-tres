from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TimesheetViewSet, TaskViewSet, AdminLoginViewSet, github_webhook, admin_login_view

router = DefaultRouter()
router.register(r'home', ProjectViewSet)
router.register(r'timesheets', TimesheetViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'team-members', AdminLoginViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('github-webhook/', github_webhook, name='github-webhook'),
    path('admin-login/', admin_login_view, name='admin-login'),
]