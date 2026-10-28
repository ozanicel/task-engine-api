from django.db import models
from django.contrib.auth.models import User #Djangonun  user modeli
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
import datetime


#----------------------------------------------------------------
# class Meta: Nedir?
# Django'da modellerin kendi alanları (name, owner vb.) dışında, veritabanı tablosunun genel davranışlarını
# ayarlamak için kullandığımız özel bir alandır. Tablo adı, sıralama kuralları veya kısıtlamalar buraya yazılır.

# constraints (Kısıtlamalar):
# Veritabanına "şu kurala kesinlikle uyulacak, uyulmayan veriyi kaydetme" dediğimiz yerdir.


#----------------------------------------------------------------

# models.Model Django'ya şu emri verir:  
# Bu sadece sıradan bir Python sınıfı değil. Bu sınıfı veritabanında task_engine_task isimli bir tabloya dönüştür.
# ORM (Object-Relational Mapping)

#yani SQL dilinde CREATE TABLE yazmak yerine python kodu yazıp,djangonun SQL çevirmesini sağlamak.

# 1.  Category TANIM
class Category(models.Model):
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='categories')
    description = models.TextField(blank=True, null=True)

    class Meta:
        # Bu kural sayesinde aynı kullanıcı aynı isimde birden fazla kategori açamaz ÖNEMLİ!
        constraints = [
            models.UniqueConstraint(fields=['owner', 'name'], name='unique_user_category')
        ]

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
    # Task modeli içine eklenecek alan:
    assigned_to = models.ManyToManyField(User, related_name='assigned_tasks', blank=True)

    # Görevin sahibi
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tasks') 

    def __str__(self):
        return self.title

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    profile_picture = models.ImageField(upload_to='profile_pics/', blank=True, null=True)

    def __str__(self):
        return f"{self.user.username} - Profile"

# Kullanıcı ilk kez oluşturulduğunda otomatik profil oluşturan sinyal:
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

class OTP(models.Model):
    user =models.OneToOneField(User, on_delete=models.CASCADE)  #OneToOneField: Bir kullanıcının aynı anda sadece bir tane aktif doğrulama kodu olmasını sağlar.
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # Kodun geçerlilik süresini 5 dakika olarak ayarlıyoruz
        return self.created_at >= timezone.now() - datetime.timedelta(minutes=5)

    def __str__(self):
        return f"{self.user.username} - OTP Kodu"
    
class Friendship(models.Model):
    STATUS_CHOİCE = (
        ('pending', 'Beklemede'),
        ('accepted', 'Kabul Edildi'),
        ('rejected', 'Reddedildi'),
    )

    #bunların herbiri database de ayrı ayrı column
    sender = models.ForeignKey(User, related_name='sent_friend_request',on_delete=models.CASCADE)
    receiver = models.ForeignKey(User, related_name='received_friend_request', on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOİCE, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Aynı iki kullanıcı arasında birden fazla aynı istek oluşmasını engellemek için
        unique_together = ('sender', 'receiver')

    def __str__(self):
        return f"{self.sender.username} -> {self.receiver.username} ({self.status})"
    

class Notification(models.Model):
    NOTIFICATION_TYPES =(
        ('friend_request', 'Friend Request'), #Arkadaşlık isteği geldiğinde.
        ('friend_accepted', 'Friend Accepted'),#Arkadaşlık isteği kabul edildiğinde.
        ('friend_rejected', 'Friend Rejected'),#Arkadaşlık isteği red edildiğinde.
        ('task_assigned', 'Task Assigned'),#Bir göreve atandığında.
        ('task_update_request', 'Task Update Request'), # İleride onay mekanizması için de kullanacağız, Birisi görevde düzenleme talep ettiğinde.
        ('task_proposal_approved', 'Task Proposal Approved'),
        ('task_proposal_rejected', 'Task Proposal Rejected'),
        
    )

    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='actor_notifications',null=True, blank=True)
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=225)
    message = models.TextField()
    is_read = models.BooleanField(default=False) #Kullanıcının bildirimi görüp görmediğini takip eder
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.recipient.username} - {self.title}"

class TaskUpdateProposal(models.Model):
    STATUS_CHOICES=(
        ('pending','Beklemede'),
        ('approved','Onaylandi'),
        ('rejected','Reddedildi'),
    )

    task=models.ForeignKey('Task', on_delete=models.CASCADE, related_name='update_propsals') # hangi görev        OKULDA GÖRDÜĞÜM REFERENCES gibi
    proposed_by= models.ForeignKey(User, on_delete=models.CASCADE, related_name='task_proposals') # hangi kullanıcının gönderdi

    # related_name:Ters yönlü sorgulama yapmamızı sağlar.
    # task nesnesinin üzerinden task.update_proposals.all() diyerek o göreve gelen tüm güncelleme tekliflerini anında listeleyebiliriz.
    # ynı şekilde kullanıcı üzerinden de user.task_proposals.all() diyerek o kullanıcının yaptığı teklifleri çekebiliriz.

    title= models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES,default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Teklif #{self.id} - {self.task.title} ({self.proposed_by.username})"

