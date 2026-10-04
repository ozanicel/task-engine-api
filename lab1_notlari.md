# Lab 1: Task Engine API - Sistem Dokümantasyonu

## 1. Proje Mimarisi ve Klasör Yapısı

Bu projede Django'nun modüler mimarisi kullanılmıştır. Klasörlerin projedeki rolleri şu şekildedir:

```text
task_engine_project/
│
├── core/             # Proje Yönetim Merkezi (Project Config)
│   ├── settings.py   # Genel ayarlar, veritabanı konfigürasyonu ve yüklü paketler.
│   └── urls.py       # Ana kapı; gelen istekleri ilgili uygulama (app) yollarına bağlar.
│
├── task_engine/      # Aktif İş Modülü (Application App)
│   ├── models.py     # Veritabanı şeması (Task tablosu).
│   ├── serializers.py# Veri dönüştürücü (Python objesi <-> JSON).
│   ├── views.py      # API mantığı ve veritabanı sorgu kuralları (TaskViewSet).
│   ├── urls.py       # Uygulamanın kendi endpoint yönlendirmeleri (Router).
│   └── admin.py      # Django Yönetim Paneli özelleştirmeleri.
│
└── manage.py         # Proje yönetim ve komut satırı aracı.

Neden core ve task_engine ayrı?

core projenin beynidir (ayarlar, ana yönlendirmeler); task_engine ise sadece görev yönetimine odaklanan bağımsız bir modüldür. Bu ayrım, ileride projeye users veya notifications gibi yeni modüller eklendiğinde kod yapısının karmaşıklaşmasını engeller.

2. Kullanılan Yapılar ve Akış Mantığı

Projeden geçen veri akışı şu sırayı takip eder:
İstek (HTTP) -> Router -> ViewSet -> Serializer -> Model (Database)

Model (models.py): Görevin title, description, status ve created_at gibi alanlarını veritabanında saklar.

Serializer (serializers.py): Veritabanından çıkan veriyi istemciye (Frontend) göndermek için JSON formatına çevirir (veya tersi).

ViewSet (views.py): Standart GET, POST, PUT, DELETE (CRUD) işlemlerinin mantığını tek merkezden yürütür.

Router (urls.py): Endpoint adreslerini manuel yazmak yerine DRF'in otomatik üretmesini sağlar.

3. Kurulum ve Çalıştırma
Projenin yerel ortamda çalıştırılması için gerekli adımlar:
venv\Scripts\activate
python manage.py runserver

Erişim Noktaları (Endpoints):
Görev Listesi / Ekleme: http://127.0.0.1:8000/api/tasks/
Tekil Görev İşlemleri: http://127.0.0.1:8000/api/tasks/<id>/