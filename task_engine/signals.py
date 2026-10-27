from django.db.models.signals import post_save, m2m_changed
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import Friendship, Task, Notification

@receiver(post_save, sender=Friendship)
def create_friendship_notification(sender, instance, created, **kwargs):
    """Arkadaşlik isteği atildiğinda veya durum değiştirdiğinde bildirim oluşturur."""
    if created :
        # Yeni bir arkadaşlık isteği gönderildiğinde (sender -> receiver)
        Notification.objects.create(
            recipient=instance.receiver,
            actor=instance.sender,
            notification_type='friend_request',
            title='Yeni Arkadaşlik İsteği',
            message=f'{instance.sender.username} sana arkadaşlik isteği gönderdi.'
        )
    else:
        # İstek kabul edildiğinde veya reddedildiğinde
        if instance.status == 'accepted':
            Notification.objects.create(
                recipient=instance.sender,
                actor=instance.receiver,
                notification_type='friend_accepted',
                title='Arkadaşlik İsteği Kabul Edildi',
                message=f'{instance.receiver.username} arkadaşlik isteğini kabul etti.'
            )
        elif instance.status == 'rejected':
            Notification.objects.create(
                recipient=instance.sender,
                actor=instance.receiver,
                notification_type='friend_rejected', # İsteğe bağlı, Notification modeline 'friend_rejected' ekleyebilirsin ya da genel tutabilirsin
                title='Arkadaşlik İsteği Reddedildi',
                message=f'{instance.receiver.username} arkadaşlik isteğini reddetti.'
            )    

@receiver(m2m_changed, sender=Task.assigned_to.through)
def create_task_assigned_notification(sender, instance, action, pk_set, **kwargs):
    """Bir göreve yeni kullanicilar atandiğinda onlara bildirim gönderir."""
    # Sadece yeni eleman eklendiğinde ('post_add') tetiklensin
    if action == 'post_add':
        for user_pk in pk_set:
            assigned_user = User.objects.get(pk=user_pk)

            # Görevi atayan kişi kendisi değilse bildirim gitsin
            if instance.owner != assigned_user:
                Notification.objects.create(
                    recipient=assigned_user,
                    actor=instance.owner,
                    notification_type='task_assigned',
                    title='Yeni Görev Atandi',
                    message=f'{instance.owner.username} seni "{instance.title}" görevine atadı.'
                )