from rest_framework import serializers
from .models import Category, Task

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source= 'category.name')
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'category','category_name', 'created_at', 'updated_at' ]  #Dış dünyaya hangi alanların açılacağını belirler.
        read_only_fields = ['id', 'created_at', 'updated_at' ]