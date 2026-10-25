from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
import re
from django.contrib.auth.password_validation import validate_password as django_validate_password
from rest_framework import serializers
from .models import Category, Task, UserProfile
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import Friendship
from django.db.models import Q

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['owner']

class TaskSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')

    assigned_to_usernames = serializers.SlugRelatedField(
        many=True, 
        queryset=User.objects.none(),  
        slug_field='username', 
        source='assigned_to', 
        required=False
    )
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'status', 'priority', 
            'due_date', 'category', 'category_name', 
            'created_at', 'updated_at', 'owner', 'assigned_to_usernames'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        
        user = None
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
        
        if user:
            # 1. Kategori filtresi
            self.fields['category'].queryset = Category.objects.filter(owner=user)
            
            # 2. Arkadaş filtresi
            friendships = Friendship.objects.filter(
                (Q(sender=user) | Q(receiver=user)) & Q(status='accepted')
            )
            
            friend_ids = []
            for f in friendships:
                if f.sender_id == user.id:
                    friend_ids.append(f.receiver_id)
                else:
                    friend_ids.append(f.sender_id)
            
            # DRF HTML formunun queryset'i ve seçenekleri doğrudan tanıması için:
            friends_qs = User.objects.filter(id__in=friend_ids)
            self.fields['assigned_to_usernames'].queryset = friends_qs
            # HTML form render motoru için iç seçenekleri güncelliyoruz:
            self.fields['assigned_to_usernames'].child_relation.queryset = friends_qs

            # --- YENİ GÜVENLİK KONTROLÜ ---
            # Eğer bu bir güncelleme (PUT/PATCH) işlemliyse ve işlem yapan kullanıcı 
            # görevin sahibi (owner) DEĞİLSE, atananlar alanını salt okunur (read-only) yapalım!
            if self.instance and self.instance.owner != user:
                self.fields['assigned_to_usernames'].read_only = True


        else:
            self.fields['category'].queryset = Category.objects.all()
            self.fields['assigned_to_usernames'].queryset = User.objects.all()

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['owner'] = request.user
        return super().create(validated_data)


class RegisterSerializer(serializers.ModelSerializer):
    password= serializers.CharField(write_only=True) # Şifrenin dışarıdan okunmasını engellemek için write_only

    class Meta:
        model= User
        fields= ['id', 'username', 'email', 'password']

    def validate_password(self,value):
        django_validate_password(value)

        if not re.search(r'[A-Za-z]',value) or not re.search(r'[0-9]' ,value):
            raise serializers.ValidationError("Şifre en az bir harf (A-Z veya a-z) ve bir rakam (0-9) içermelidir.")
        return value


    def create(self, validated_data):
        # Kullanıcıyı güvenli bir şekilde şifreyi hashleyerek oluştur
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email'),
            password=validated_data.get('password'),
        )
        # Kullanıcı kayıt olduğu anda onun için bir Token üretiyoruz
        Token.objects.create(user=user)
        return user
    

class UserProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserProfile
        fields = ['profile_picture']
        
    extra_kwargs ={
        'profile_picture': {'required': False}
    }

class OTPVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6, min_length=6, help_text="E-posta gelen 6 haneli kod")

class FriendRequestSerializer(serializers.ModelSerializer):
    sender_username = serializers.ReadOnlyField(source = 'sender.username')
    receiver_username = serializers.ReadOnlyField(source ='receiver.username')

    class Meta:
        model = Friendship
        fields = ['id','sender','sender_username','receiver','receiver_username','status','created_at']
        read_only_fields = ['sender', 'status', 'created_at']
