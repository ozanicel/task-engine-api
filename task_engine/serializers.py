import re
from django.contrib.auth.password_validation import validate_password as django_validate_password

from rest_framework import serializers
from .models import Category, Task

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['owner']

class TaskSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source= 'category.name')
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'status', 'priority', 'due_date', 'category','category_name', 'created_at', 'updated_at','owner' ]  #Dış dünyaya hangi alanların açılacağını belirler.
        read_only_fields = ['id', 'created_at', 'updated_at','owner' ]

    # -- KATEGORİ eklenen hesap dışında başka hesapta görünmemesi için -- 
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request,'user') and request.user.is_authenticated:
            self.fields['category'].queryset = Category.objects.filter(owner=request.user)
        else:
            self.fields['category'].queryset = Category.objects.none()


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


