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
        fields = ['id', 'title', 'description', 'status', 'category','category_name', 'created_at', 'updated_at','owner' ]  #Dış dünyaya hangi alanların açılacağını belirler.
        read_only_fields = ['id', 'created_at', 'updated_at','owner' ]
    # -- KATEGORİ eklenen hesap dışında başka hesapta görünmemesi için -- 
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if request and hasattr(request,'user'):
            self.fields['category'].queryset = Category.objects.filter(owner=request.user)


class RegisterSerializer(serializers.ModelSerializer):
    password= serializers.CharField(write_only=True) # Şifrenin dışarıdan okunmasını engellemek için write_only

    class Meta:
        model= User
        fields= ['id', 'username', 'email', 'password']

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


