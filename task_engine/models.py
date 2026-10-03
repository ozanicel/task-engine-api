from django.db import models

# Create your models here.

# models.Model Django'ya şu emri verir:  
# Bu sadece sıradan bir Python sınıfı değil. Bu sınıfı veritabanında task_engine_task isimli bir tabloya dönüştür.
# ORM (Object-Relational Mapping)

#yani SQL dilinde CREATE TABLE yazmak yerine python kodu yazıp,djangonun SQL çevirmesini sağlamak.
class Task(models.Model):
    class StatusChoices(models.TextChoices):
        TODO = 'TODO', 'To Do'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        DONE = 'DONE', 'Done'

    title = models.CharField(max_length=255)  #SQL deki VARCHAR(255)
    description = models.TextField(blank=True, null=True) #blank=true boş gönderilmesini sağlar. 
    status = models.CharField(
        max_length=20,
        choices=StatusChoices.choices,
        default=StatusChoices.TODO
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.status}"