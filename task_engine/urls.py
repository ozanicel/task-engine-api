from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, TaskViewSet, RegisterView, UserProfileView
from rest_framework.authtoken.views import obtain_auth_token
from .views import VerifyOTPView

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns=[
    path('', include(router.urls)),
    path('register/', RegisterView.as_view(), name='register'), #bu path açıldığında RegisterView sınıfını çalıştırır
    path('login/', obtain_auth_token, name='api_token_auth'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),


]