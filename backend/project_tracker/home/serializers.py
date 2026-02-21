from rest_framework import serializers
from .models import Project, Timesheet, TimesheetTask


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'mode', 'version', 'url', 'remarks', 'hourly_rate']
class TimesheetTaskInputSerializer(serializers.Serializer):
    description = serializers.CharField()
    hours = serializers.DecimalField(max_digits=5, decimal_places=2)


class TimesheetCreateSerializer(serializers.Serializer):
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())
    employee_name = serializers.CharField(max_length=100)
    date = serializers.DateField()
    tasks = TimesheetTaskInputSerializer(many=True)

    def create(self, validated_data):
        tasks_data = validated_data.pop('tasks')
        project = validated_data['project']
        rate = project.hourly_rate

        timesheet = Timesheet.objects.create(
            hourly_rate=rate,
            total_hours=0,
            total_amount=0,
            **validated_data
        )

        total_hours = 0
        for task in tasks_data:
            hours = task['hours']
            amount = hours * rate
            TimesheetTask.objects.create(
                timesheet=timesheet,
                description=task['description'],
                hours=hours,
                amount=amount
            )
            total_hours += hours

        timesheet.total_hours = total_hours
        timesheet.total_amount = total_hours * rate
        timesheet.save()
        return timesheet


class TimesheetTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimesheetTask
        fields = ['id', 'description', 'hours', 'amount']


class TimesheetSerializer(serializers.ModelSerializer):
    tasks = TimesheetTaskSerializer(many=True, read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Timesheet
        fields = ['id', 'project', 'project_name', 'employee_name', 'date',
                  'hourly_rate', 'total_hours', 'total_amount', 'submitted_at', 'tasks']