from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Category, Task
from .serializers import CategorySerializer, TaskSerializer

from rest_framework import generics
from rest_framework.permissions import AllowAny,IsAuthenticated
from django.contrib.auth.models import User
from .serializers import RegisterSerializer
from rest_framework.pagination import PageNumberPagination


class CategoryViewSet(viewsets.ModelViewSet):
     queryset = Category.objects.all() #View'e "Veritabanından hangi verileri çekeceksin?" sorusunun cevabıdır.
     serializer_class = CategorySerializer #View'e "Çektiğin bu verileri dış dünyaya sunarken hangi dönüştürücüyü kullanacaksın?
     permission_classes = [IsAuthenticated]

     def get_queryset(self):
        # Sadece giriş yapan kullanıcının kategorilerini listele
        return Category.objects.filter(owner=self.request.user)
     
     def perform_create(self, serializer):
        # Kategoriyi oluşturanı otomatik ata
        serializer.save(owner=self.request.user)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all() #View'e "Veritabanından hangi verileri çekeceksin?" sorusunun cevabıdır.
    serializer_class = TaskSerializer #View'e "Çektiğin bu verileri dış dünyaya sunarken hangi dönüştürücüyü kullanacaksın?

    # Filtreleme, Arama ve Sıralama Yettenekleri
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields =['priority','status', 'category'] #Birebir eşleme
    search_fields = ['title','description']  #metin içi arma yapılcak alanlar
    ordering_fields = ['created_at', 'due_date', 'priority', 'status', 'title'] #sıralama yapılabilecek alanlar
    ordering = ['-created_at']
    pagination_class = PageNumberPagination

    def get_queryset(self):
         user =self.request.user
         if user.is_authenticated:
             return Task.objects.filter(owner=user)
         return  Task.objects.none()

    def perform_create(self, serializer):
         serializer.save(owner=self.request.user)

class RegisterView(generics.CreateAPIView):
     queryset = User.objects.all()
     serializer_class = RegisterSerializer
     permission_classes=[AllowAny]#Giriş yapmış herkes kayıt olabilsin diye




