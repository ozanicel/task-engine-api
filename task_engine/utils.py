import random
from django.core.mail import send_mail

def generate_otp():
    return str(random.randint(100000, 999999))

def send_otp_email(email, otp_code):
    subject ='Task Engine - E-posta Doğrulama Kodu'
    message = f'Sisteme kayit olduğunuz için teşekkürler\n\nDoğrulama kodunuz: {otp_code}\n\nBu kodun geçerlilik süresi 5 dakikadir.'

    send_mail(
        subject,
        message,
        None, #Gönderi kısmı 
        [email],# alıcı listesi
        fail_silently=False
    )
