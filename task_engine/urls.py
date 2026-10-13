from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, TaskViewSet, RegisterView
from rest_framework.authtoken.views import obtain_auth_token

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns=[
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'), #bu path açıldığında RegisterView sınıfını çalıştırır
    path('login/', obtain_auth_token, name='api_token_auth'),
]