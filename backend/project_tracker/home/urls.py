from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, TimesheetViewSet

router = DefaultRouter()
router.register(r'home', ProjectViewSet)
router.register(r'timesheets', TimesheetViewSet)

urlpatterns = [
    path('', include(router.urls)),
]