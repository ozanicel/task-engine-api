from rest_framework import viewsets
from drf_spectacular.utils import extend_schema, OpenApiTypes, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Category, Task, UserProfile
from .serializers import CategorySerializer, TaskSerializer,UserProfileSerializer

from rest_framework import generics, permissions
from rest_framework.permissions import AllowAny,IsAuthenticated
from django.contrib.auth.models import User
from .serializers import RegisterSerializer
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import OTP
from .serializers import OTPVerifySerializer
from .utils import generate_otp, send_otp_email

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
             return Task.objects.filter(owner=self.request.user)
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