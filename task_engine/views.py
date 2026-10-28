from rest_framework import viewsets
from django.db import models
import django_filters
from drf_spectacular.utils import extend_schema, OpenApiTypes, OpenApiParameter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Category, Task, UserProfile
from .serializers import CategorySerializer, TaskSerializer,UserProfileSerializer,RegisterSerializer

from rest_framework import generics, permissions,mixins
from rest_framework.permissions import AllowAny,IsAuthenticated
from django.contrib.auth.models import User
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import OTP
from .serializers import OTPVerifySerializer
from .utils import generate_otp, send_otp_email
from rest_framework.decorators import api_view, permission_classes
from .models import Friendship
from .serializers import FriendRequestSerializer
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt

from .models import Notification, TaskUpdateProposal
from .serializers import NotificationSerializer, TaskUpdateProposalSerializer,ProposalRespondSerializer
from rest_framework.viewsets import GenericViewSet
from rest_framework.decorators import action


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Sadece giriş yapan kullanıcının kategorilerini getir
        return Category.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class TaskFilter(django_filters.FilterSet):
    class Meta:
        model = Task
        fields = ['priority', 'status', 'category']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = self.request.user
        if user.is_authenticated:
            # Filtreleme formundaki kategori seçeneklerini sadece o kullanıcıya ait olanlarla kısıtlıyoruz!
            self.filters['category'].queryset = Category.objects.filter(owner=user)

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all() #View'e "Veritabanından hangi verileri çekeceksin?" sorusunun cevabıdır.
    serializer_class = TaskSerializer #View'e "Çektiğin bu verileri dış dünyaya sunarken hangi dönüştürücüyü kullanacaksın?

    # Filtreleme, Arama ve Sıralama Yettenekleri
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = TaskFilter
    filterset_fields =['priority','status', 'category'] #Birebir eşleme
    search_fields = ['title','description']  #metin içi arma yapılcak alanlar
    ordering_fields = ['created_at', 'due_date', 'priority', 'status', 'title'] #sıralama yapılabilecek alanlar
    ordering = ['-created_at']
    pagination_class = PageNumberPagination

    def get_queryset(self):
         user =self.request.user
         if user.is_authenticated:
             return Task.objects.filter(Q(owner=user) | Q(assigned_to=user)).distinct()
         return  Task.objects.none()

    def perform_create(self, serializer):
         serializer.save(owner=self.request.user)

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        username = request.data.get("username")
        email = request.data.get("email")

        # Aynı e-posta veya kullanıcı adı ile daha önce açılmış pasif hesapları bul ve tamamen sil
        User.objects.filter(email=email, is_active=False).delete()
        User.objects.filter(username=username, is_active=False).delete()

        # Eğer hala aktif (zaten onaylanmış) bir kullanıcı varsa hata döndür
        if User.objects.filter(email=email, is_active=True).exists() or User.objects.filter(username=username, is_active=True).exists():
            return Response(
                {"error": "Bu kullanici adi veya e-posta zaten kullanimda ve aktif."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        user = serializer.save()
        user.is_active = False
        user.save()

        otp_kodu = generate_otp()
        OTP.objects.create(user=user, code=otp_kodu)
        send_otp_email(user.email, otp_kodu)

class UserProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        # Kullanıcının profili varsa getirir, yoksa otomatik olarak yeni bir tane oluşturur
        profile, created = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

    # SADECE PATCH İSTEĞİ İÇİN SWAGGER'I ZORLUYORUZ
    @extend_schema(
        operation_id='upload_profile_picture',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'profile_picture': {
                        'type': 'string',
                        'format': 'binary'  # İşte bu kısım Swagger'a dosya butonu çıkarmasını söyler!
                    }
                }
            }
        }
    )

    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)

    # PUT İSTEĞİNİ GİZLEYEBİLİRİZ VEYA AYNI ŞEKİLDE UYARLAYABİLİRİZ (Opsiyonel)
    @extend_schema(exclude=True) 
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)





class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        code = str(request.data.get("code")).strip()

        if not email or not code:
            return Response({"error": "E-posta ve kod alanlari zorunludur."}, status=status.HTTP_400_BAD_REQUEST)

        # E-postaya ait aktif olmayan kullanıcıyı bul
        user = User.objects.filter(email=email, is_active=False).first()
        if not user:
            return Response({"error": "Bu e-posta adresine sahip doğrulanmayi bekleyen kullanici bulunamadi."}, status=status.HTTP_400_BAD_REQUEST)
        
        otp_record = OTP.objects.filter(user=user).last()
        if not otp_record:
            return Response({"error": "Size ait bir doğrulama kodu bulunamadi."}, status=status.HTTP_400_BAD_REQUEST)

        # Karşılaştırma
        if str(otp_record.code) == code:
            user.is_active = True
            user.save()
            OTP.objects.filter(user=user).delete()
            return Response({"mesaj": "E-posta adresiniz başariyla doğrulandi!"}, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Hatali doğrulama kodu."}, status=status.HTTP_400_BAD_REQUEST)

@extend_schema(
    request={
        'application/json': {
            'type': 'object',
            'properties': {
                'username': {'type': 'string', 'description': 'Arkadaş eklenecek kullanicinin adi'}
            },
            'required': ['username']
        }
    }
)
@csrf_exempt        
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_request(request):
    receiver_username = request.data.get('username')
    if not receiver_username:
        return Response({"error": "Kullanici adi gereklidir."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        receiver = User.objects.get(username=receiver_username)
    except User.DoesNotExist:
        return Response({"error:" "Kullanici bulunamadi." },status=status.HTTP_404_NOT_FOUND)

    if receiver == request.user:
        return Response({"error": "Kendine arkadaşlik isteği atamazsin."}, status=status.HTTP_400_BAD_REQUEST)

    if Friendship.objects.filter(sender=request.user, receiver=receiver).exists():
        return Response({"error": "Bu kullaniciya zaten arkadaşlik isteği gönderdiniz."}, status=status.HTTP_400_BAD_REQUEST)

    if Friendship.objects.create(sender=request.user, receiver=receiver):
        return Response({"message": "Arkadaşlik isteği başariyla gönderildi."}, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_friend_requests(request):
    #gelen ve durumu 'pending' olan istekleri alıyoruz
    request = Friendship.objects.filter(receiver=request.user, status='pending')
    serializer = FriendRequestSerializer(request, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_friend_request(request, pk):
    try:
        #Sadece bana gelen istekleri getir
        firend_request = Friendship.objects.get(pk=pk, receiver=request.user, status='pending')
    except Friendship.DoesNotExist:
        return Response({"error": "Böyle bir arkadaşlik isteği bulunamadi"}, status= status.HTTP_404_NOT_FOUND)

    action = request.data.get('action') #accept veya reject gelebilir

    if action == 'accept':
        firend_request.status = 'accepted'
        firend_request.save()
        return Response({"message": "Arkadaşlik isteği kabul edildi"}, status=status.HTTP_200_OK)
    elif action == 'reject':
        firend_request.status = 'rejected'
        firend_request.save()
        return Response ({"message": "Arkadşlik isteği reddelidi"}, status=status.HTTP_200_OK)
    else:
        return Response({"error": "Geçersiz işlem. 'accept' veya 'reject' gönderin."},status=status.HTTP_400_BAD_REQUEST) 


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_friends(request):
    
    # Kullanıcının içinde olduğu ve kabul edilmiş tüm ilişkileri çekiyoruz
    friendships = Friendship.objects.filter(
        (Q(sender=request.user) | Q(receiver=request.user)) & Q(status='accepted')
    )
    #Karşı taraftaki kişilerin listesini ayıklamak için:
    friends =[]
    for f in friendships:
        if f.sender == request.user:
            friends.append(f.receiver.username)
        else:
            friends.append(f.sender.username)
    return Response({"friends": friends}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_task(request):
    # Serializera dışarıdan gelen veriyi ve request context'ini veriyoruz
    serializer = TaskSerializer(data=request.data, context={'request': request})

    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_tasks(request):
    # Kullanıcının kendi oluşturduğu VEYA bir arkadaşının ona atadığı görevleri çekiyoruz
    tasks = Task.objects.filter(Q(owner=request.user) | Q(assigned_to=request.user))
    serializer = TaskSerializer(tasks, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationViewSet(mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          mixins.UpdateModelMixin,
                          GenericViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')# Kullanıcı sadece KENDİ bildirimlerini görebilsin


class TaskUpdateProposalViewSet(viewsets.ModelViewSet):
    queryset = TaskUpdateProposal.objects.all()
    serializer_class = TaskUpdateProposalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Kullanıcı ya kendi yaptığı teklifleri görecek ya da kendi sahip olduğu görevlere gelen teklifleri onaylayacak/reddedecek
        return TaskUpdateProposal.objects.filter(
            models.Q(proposed_by=user) | models.Q(task__owner=user)
        ).distinct()

    #Görev sahibinin teklifi onaylama veya reddetme uç noktası: /api/proposals/<id>/respond/
    @action(detail=True, methods=['post'],serializer_class=ProposalRespondSerializer,  url_path='respond', url_name='respond')
    def respond(self, request, pk=None):
        proposal = self.get_object()
        task = proposal.task


    # GÜVENLİK KONTROLÜ: Sadece görevin gerçek sahibi (owner) bu teklife yanıt verebilir!
        if task.owner != request.user:
            return Response(
                {"detail": "Bu teklifi yanit verme yetkiniz yok. Sadece görev sahibi onaylayabilir."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        action_type = request.data.get('action') # 'approve' veya 'reject' bekliyoruz

        if action_type == 'approve':
            proposal.status ='approved'
            proposal.save()

            # Teklif onaylandığına göre, değişiklikleri asıl Task modeline işleyelim!
            task.title = proposal.title
            task.description = proposal.description
            task.save()

            Notification.objects.create(
                recipient=proposal.proposed_by,
                actor=request.user,
                notification_type='task_proposal_approved',
                title='Görev Güncelleme Teklifi Onaylandi',
                message=f"{request.user.username}, '{task.title}' görevi için yaptiğin güncelleme teklifini onayladi."
            )

            return Response({"detail": "Teklif onaylandi ve görev güncellendi."})

        elif action_type == 'reject':
            proposal.status = 'rejected'
            proposal.save()

            Notification.objects.create(
                recipent=proposal.proposed_by,
                actor=request.user,
                notification_type='task_proposal_rejected',
                title='Görev Güncelleme Teklifi Reddedildi',
                message=f"{request.user.username}, '{task.title}' görevi için yaptığın güncelleme teklifini reddetti."
            )
            return Response({"detail": "Teklif reddedildi."})

        else:
            return Response (
                {"detail": "Geçersiz aksiyon. 'approve' veya 'reject' göndermelisiniz."},
                status=status.HTTP_400_BAD_REQUEST
            )
    def perform_create(self, serializer):
        proposal = serializer.save()
        task = proposal.task

        if task.owner !=self.request.user:
            Notification.objects.create(
                recipient = task.owner,
                notification_type='task_update_request',
                title='Görev Güncelleme Talebi',
                message=f"{self.request.user.username}, '{task.title}' görevi için bir güncelleme teklifi gönderdi."
            )
