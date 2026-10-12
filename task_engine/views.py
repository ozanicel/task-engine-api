from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Category, Task
from .serializers import CategorySerializer, TaskSerializer

class CategoryViewSet(viewsets.ModelViewSet):
     queryset = Category.objects.all() #View'e "Veritabanından hangi verileri çekeceksin?" sorusunun cevabıdır.
     serializer_class = CategorySerializer #View'e "Çektiğin bu verileri dış dünyaya sunarken hangi dönüştürücüyü kullanacaksın?


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all() #View'e "Veritabanından hangi verileri çekeceksin?" sorusunun cevabıdır.
    serializer_class = TaskSerializer #View'e "Çektiğin bu verileri dış dünyaya sunarken hangi dönüştürücüyü kullanacaksın?

    # Filtreleme, Arama ve Sıralama Yettenekleri
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields =['status', 'category'] #Birebir eşleme
    search_fields = ['title','description']  #metin içi arma yapılcak alanlar
    ordering_fields = ['created_at','title'] #sıralama yapılabilecek alanlar





