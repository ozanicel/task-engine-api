from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, TaskViewSet, RegisterView, UserProfileView
from rest_framework.authtoken.views import obtain_auth_token
from .views import VerifyOTPView ,send_friend_request, list_friend_requests, respond_friend_request, list_friends, create_task, list_tasks

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns=[
    path('register/', RegisterView.as_view(), name='register'), #bu path açıldığında RegisterView sınıfını çalıştırır
    path('login/', obtain_auth_token, name='api_token_auth'),
    path('profile/', UserProfileView.as_view(), name='user-profile'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('friends/send/', send_friend_request, name='send-friend-request'),
    path('friends/requests/', list_friend_requests, name='list-friend-requests'),
    path('friends/respond/<int:pk>/', respond_friend_request, name='respond-friend-request'),
    path('friends/list/', list_friends, name='list-friends'),
    path('tasks/create/', create_task, name='create-task'),
    path('tasks/list/', list_tasks, name='list-tasks'),
    path('', include(router.urls)),



]