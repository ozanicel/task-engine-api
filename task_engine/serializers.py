from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'created_at', 'updated_at' ]  #Dış dünyaya hangi alanların açılacağını belirler.
        read_only_fields = ['id', 'created_at', 'updated_at' ]