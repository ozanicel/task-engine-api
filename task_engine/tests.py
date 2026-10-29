import pytest
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.test import APITestCase
from django.urls import reverse
import io
from PIL import Image
from .models import Task, Category, Friendship, TaskUpdateProposal

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user(db):
    user = User.objects.create_user(username="testuser", password="password123")
    return user


@pytest.mark.django_db
def test_authenticated_task_list(api_client, create_user):
    """Giriş yapmiş kullanici kendi görev listesini görebilir"""
    api_client.force_authenticate(user=create_user)
    response = api_client.get('/api/tasks/')
    assert response.status_code == status.HTTP_200_OK

@pytest.mark.django_db
def test_create_category(api_client, create_user):
    """Giriş yapmiş kullanici yeni kategori oluşturabilir"""
    api_client.force_authenticate(user=create_user)
    response = api_client.post('/api/categories/', {'name': 'İş'})
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['name'] == 'İş'

@pytest.mark.django_db
def test_task_isolation(api_client):
    """bir kullaninin görevlerini baska kullanici göremez(Multi-tenant izolasyonu)"""
    from .models import Task

    #1- birinci kullanıcıyi ve ona ait görev oluşturalım
    user1= User.objects.create_user(username="user1", password="password123")
    Task.objects.create(title="user1 in gizli görevi", owner=user1)

    # 2- İkinci kullanıcıyı  ve onunla giriş yapalım
    user2 = User.objects.create_user(username="user2", password="password123")
    api_client.force_authenticate(user=user2)

    # 3- User2 görev listesini çektiğinde sonuç boş dönmeli (izolasyon testi)
    response = api_client.get('/api/tasks/')
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data['results']) == 0


@pytest.mark.django_db
def test_create_task(api_client, create_user):
    """Giriş yapmiş kullanici  kendi kategorisine bağli yeni bir görev oluşturabilir"""
    from .models import Category

    # 1. Önce kullanıcıya ait bir kategori oluşturalım
    category = Category.objects.create(name="Yazilim", owner=create_user)
    # 2. Kullanıcıyı giriş yapalım
    api_client.force_authenticate(user=create_user)
    # 3. Görev oluşturalım
    payload ={
        "title": "görev oluşturma test kontrol",
        "description": "Pytest test yaziyorum",
        "priority": "HIGH",
        "status": "IN_PROGRESS",
        "category": category.id
    }
    response = api_client.post('/api/tasks/', payload, format='json')
    print("HATA DETAYI:", response.data)
    #doğrulamala
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['title'] == "görev oluşturma test kontrol"
    assert response.data['category'] == category.id

@pytest.mark.django_db
def test_update_task(api_client, create_user):
    """giriş yapmiş kullanici kendi görevini güncelleyebilir"""
    from .models import Task, Category

    #1- ilk olarka kategori ve görev oluşturalım.
    category = Category.objects.create(name="İş", owner=create_user)
    task = Task.objects.create(
        title="Eski Başlik",
        priority="HIGH",
        status="IN_PROGRESS",
        category=category,
        owner=create_user
    )
    # 2- kullanıcı ile giriş
    api_client.force_authenticate(user=create_user)
    #3-Güncelleme verisi (payload) hazırlayalım
    payload = {
        "title": "Yeni Güncel Başlik",
        "description": "Açiklama eklendi",
        "priority": "HIGH",
        "status": "TODO",
        "category": category.id
    }
    # 4. PUT isteği atalım
    response = api_client.put(f'/api/tasks/{task.id}/', payload, format='json')
    # 5. Doğrulamalar
    assert response.status_code == status.HTTP_200_OK
    assert response.data['title'] == "Yeni Güncel Başlik"

@pytest.mark.django_db
def test_delete_task(api_client, create_user):
    """Giriş yapmiş kullanici kendi görevini silebilir"""
    from .models import Task, Category
    
    # 1. Kategori ve görev oluşturalım
    category = Category.objects.create(name="Kişisel", owner=create_user)
    task = Task.objects.create(
        title="Silinecek Görev",
        priority="LOW",
        status="TODO",
        category=category,
        owner=create_user
    )

    # 2. Giriş yapalım
    api_client.force_authenticate(user=create_user)
    
    # 3. DELETE isteği atalım
    response = api_client.delete(f'/api/tasks/{task.id}/')
    # 4. Doğrulama
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert Task.objects.filter(id=task.id).count() == 0



@pytest.mark.django_db
def test_unauthenticated_user_cannot_access_tasks(api_client):
    """Giriş yapmamiş kullanici görev listesine erişemez"""
    response = api_client.get('/api/tasks/')
    # Kimliği doğrulanmamış istekler 401 Unauthorized dönmelidir
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_user_cannot_modify_other_users_task(api_client, create_user):
    """Bir kullanici, başka bir kullaniciya ait görevi güncelleyemez"""
    from django.contrib.auth.models import User
    from .models import Task, Category
    
    # 1. Sistemde ikinci bir kullanıcı (başka biri) oluşturalım
    other_user = User.objects.create_user(username="hackeruser", password="password123")
    
    # 2. O diğer kullanıcıya ait bir kategori ve görev oluşturalım
    other_category = Category.objects.create(name="Gizli Kategori", owner=other_user)
    other_task = Task.objects.create(
        title="Başkasinin Görevi",
        priority="HIGH",
        status="TODO",
        category=other_category,
        owner=other_user
    )
    
    # 3. Biz kendi test kullanıcımız (`create_user`) ile giriş yapalım
    api_client.force_authenticate(user=create_user)
    
    # 4. Başkasının görevini güncellemeye çalışalım
    payload = {
        "title": "Çaldim Görevi",
        "priority": "HIGH",
        "status": "TODO",
        "category": other_category.id
    }
    response = api_client.put(f'/api/tasks/{other_task.id}/', payload, format='json')
    
    # 5. Sistem ya 403 (Yasaklı) ya da 404 (Bulunamadı - güvenlik için verinin varlığını bile gizleyebilir) dönmelidir
    assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

#######################################################################################################
@pytest.mark.django_db
class PasswordValidationTests(APITestCase):
    def setUp(self):
        self.register_url = reverse('register')

    def test_password_too_short(self):
        data = {
            "username": "testuser1",
            "emial": "test1@example.com",
            "password":"Ab1"
        }
        response = self.client.post(self.register_url,data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_missing_number(self):
        data = {
                    "username": "testuser2",
                    "emial": "test2@example.com",
                    "password":"onlyLetterPassword"
                }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_missing_letter(self):
        data = {
            "username": "testuser3",
            "email": "test3@example.com",
            "password": "12345678"  
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_password(self):
        data = {
            "username": "testuser4",
            "email": "test4@example.com",
            "password": "ValidPassword123"  # Kurallara uygun
        }
        response = self.client.post(self.register_url, data)
        print("RESPONSE DATA:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


@pytest.mark.django_db
class TestUserProfilePicture:
    def test_upload_profile_picture(self, client):
        """Kayit olurken veya profil güncellerken fotoğraf yüklenebilmeli"""

        # Test için geçici küçük bir görsel (resim) oluşturalım
        file = io.BytesIO()
        image = Image.new('RGB', (100, 100), color='red')
        image.save(file, 'jpeg')
        file.seek(0)

        user = User.objects.create_user(username="picuser", password="ValidPassword123")
        client.force_authenticate(user=user)

@pytest.mark.django_db
class TestUserProfilePicture:
    def test_upload_profile_picture(self, client):
        # 1. Bellekte geçici küçük bir test görseli oluşturalım (Pillow kullanarak)
        client = APIClient()
        
        file = io.BytesIO()
        image = Image.new('RGB', (100, 100), color='blue')
        image.save(file, format='jpeg')
        file.seek(0)
        file.name = 'test_avatar.jpg'

        # 2. Test kullanıcısı oluşturalım ve authenticate edelim
        user = User.objects.create_user(username="picuser", password="ValidPassword123")
        client.force_authenticate(user=user)

        # 3. Profil endpoint'ine PATCH isteği atalım
        url = reverse('user-profile')
        response = client.patch(url, {"profile_picture": file}, format='multipart')

        assert response.status_code == status.HTTP_200_OK

        #Veritabanında fotoğrafın kaydedildiğini kontrol edelim
        user.profile.refresh_from_db()
        assert user.profile.profile_picture.name is not None


class TaskAndFriendshipSecurityTests(APITestCase):
    def setUp(self):
        self.user_ozan = User.objects.create_user(username='ozan_test', password='password123')
        self.user_doga = User.objects.create_user(username='doga_test', password='password123')
        self.user_admin = User.objects.create_user(username='admin_test', password='password123')

        Friendship.objects.create(sender=self.user_ozan,receiver=self.user_doga, status='accepted') # Ozan ile Doğa arkadaş olsun (accepted)

        self.category = Category.objects.create(name='İşler',owner=self.user_ozan)# Ozan bir kategori oluştursun

    def test_owner_can_assign_friend(self):
        """Ozan, sadece arkadai olan Doğaya görev atayabilmeli. """
        self.client.force_authenticate(user=self.user_ozan)

        response = self.client.post('/api/tasks/',{
            'title':'test görevi',
            'description':'Açıklama',
            'status': 'TODO',
            'priority': 'HIGH',
            'assigned_to_usernames': ['doga_test']
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = Task.objects.get(id=response.data['id'])
        self.assertIn(self.user_doga, task.assigned_to.all())

    def test_non_owner_cannot_modify_assigned_users(self):
        """Görevin sahibi olmayan bir kullanici  görevi güncellerken assigned_to listesini değiştirememeli."""

        task = Task.objects.create(
            title='oturum görevi',
            owner=self.user_ozan
        )
        task.assigned_to.add(self.user_doga)

        # Şimdi Doğa bu görevi düzenlemeye çalışıyor
        self.client.force_authenticate(user=self.user_doga)
        response = self.client.put(f'/api/tasks/{task.id}/', {
            'title': 'Doğa Başliği Değiştirdi',
            'status': 'IN_PROGRESS',
            'priority': 'LOW',
            'assigned_to_usernames': [] # Listeyi boşaltmaya çalışıyor
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Görev başlığı değişmeli ama owner olmadığı için assigned_to listesi korunmalı!
        task.refresh_from_db()
        self.assertEqual(task.title, 'Doğa Başliği Değiştirdi')
        self.assertIn(self.user_doga, task.assigned_to.all())

@pytest.mark.django_db
def test_task_update_proposal_title_autofill(api_client, create_user):
#TaskUpdateProposal oluşturulurken title boş bırakılırsa, task'ın eski başlığı otomatik atanmali

    other_user = User.objects.create_user(username="task_owner", password="password123")
    category = Category.objects.create(name = "İş Kategorisi", owner=other_user)
    task = Task.objects.create(
        title="Orijinal Görev Başliği",
        priority="HIGH",
        status="TODO",
        category=category,
        owner=other_user
    )
    # Görevi test kullanıcımıza atayalım (böylece serializer queryset süzgecinden geçer)
    task.assigned_to.add(create_user)

    api_client.force_authenticate(user=create_user)
    payload ={
        "task": task.id,
        "title": "", #boş
        "description":"Başliği değiştirmeden sadece açiklama teklif ediyorum"
    }
    response = api_client.post('/api/proposals/', payload, format='json')

    assert response.status_code == status.HTTP_201_CREATED
    assert response.data['title'] == "Orijinal Görev Başliği"

@pytest.mark.django_db
def test_category_list_isolation(api_client):

#Bir kullanici kategori listesini çektiğinde sadece kendi kategorilerini görmeli, başkasini göremez
    user1= User.objects.create_user(username="catuser1",password="password123")
    user2= User.objects.create_user(username="catuser2",password="password123")

    Category.objects.create(name="User1'in Kategorisi",owner=user1)
    Category.objects.create(name="User2'in Kategorisi",owner=user2)

    api_client.force_authenticate(user=user1)
    response = api_client.get('/api/categories/')

# Gelen sonuçların sadece user1'e ait olduğunu doğrulayalım
    results = response.data.get('results', response.data) if isinstance(response.data, dict) else response.data
    assert len(results) == 1
    assert results[0]['name'] == "User1'in Kategorisi"