from django.db import models
from django.contrib.auth.models import User #Djangonun dahili user modeli
from django.db.models.signals import post_save
from django.dispatch import receiver

# Create your models here.

# models.Model Django'ya şu emri verir:  
# Bu sadece sıradan bir Python sınıfı değil. Bu sınıfı veritabanında task_engine_task isimli bir tabloya dönüştür.
# ORM (Object-Relational Mapping)

#yani SQL dilinde CREATE TABLE yazmak yerine python kodu yazıp,djangonun SQL çevirmesini sağlamak.

# 1.  Category TANIM
class Category(models.Model):
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


# 2. Task TANIM
class Task(models.Model):
    class StatusChoices(models.TextChoices):
        TODO = 'TODO', 'To Do'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        DONE = 'DONE', 'Done'

    class Priority(models.TextChoices):
        LOW= 'LOW', 'Low'
        MEDIUM= 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'
        
###########

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.TODO
    )
#############

    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    due_date = models.DateTimeField(blank=True, null=True)

############

    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tasks'
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Görevin sahibi
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks') 

    def __str__(self):
        return self.title

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} Profile"

# Kullanıcı ilk kez oluşturulduğunda otomatik profil oluşturan sinyal:
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()