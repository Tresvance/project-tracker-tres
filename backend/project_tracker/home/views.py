from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Project, Timesheet
from .serializers import ProjectSerializer, TimesheetSerializer, TimesheetCreateSerializer


class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer


class TimesheetViewSet(viewsets.ModelViewSet):
    queryset = Timesheet.objects.all().prefetch_related('tasks')
    serializer_class = TimesheetSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        project = self.request.query_params.get('project')
        employee = self.request.query_params.get('employee')
        if project:
            qs = qs.filter(project_id=project)
        if employee:
            qs = qs.filter(employee_name__icontains=employee)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = TimesheetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        timesheet = serializer.save()
        return Response(
            TimesheetSerializer(timesheet).data,
            status=status.HTTP_201_CREATED
        )