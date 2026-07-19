from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TimesheetViewSet, github_webhook

router = DefaultRouter()
router.register(r'home', ProjectViewSet)
router.register(r'timesheets', TimesheetViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('github-webhook/', github_webhook, name='github-webhook'),
]