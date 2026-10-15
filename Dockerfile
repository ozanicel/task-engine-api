# 1. Resmi Python imajını temel alıyoruz
FROM python:3.12-slim

# 2. Çalışma dizinini belirliyoruz
WORKDIR /app

# 3. Sistem bağımlılıklarını güncelliyoruz ve gerekli paketleri kuruyoruz
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

#4. Python bağimliklilarini dosyasini kopyaliyoruz ve yüklüyoruz
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Proje dosyalarının tamamını konteynera kopyalıyoruz
COPY . .

# 6. Django sunucusunu dış dünyaya açıyoruz
EXPOSE 8000

# 7. Konteyner ayağa kalktığında çalışacak komut (Migration ve sunucu başlatma)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]