from rest_framework import viewsets
from .models import Task
from .serializers import TaskSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all() #View'e "Veritabanından hangi verileri çekeceksin?" sorusunun cevabıdır.
    serializer_class = TaskSerializer #View'e "Çektiğin bu verileri dış dünyaya sunarken hangi dönüştürücüyü kullanacaksın?