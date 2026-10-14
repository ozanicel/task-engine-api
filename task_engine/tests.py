import pytest
from rest_framework import status
from django.contrib.auth.models import User
from rest_framework.test import APIClient

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def create_user(db):
    user = User.objects.create_user(username="testuser", password="password123")
    return user

@pytest.mark.django_db
def test_unauthenticated_task_list(api_client):
    """Kimlik doğrulamayan kullanici istek attiğinda boş liste döner (veya 401)"""
    response = api_client.get('/api/tasks/')
    # Eğer views.py içinde Task.objects.none() döndürüyorsak status 200 döner:
    assert response.status_code == status.HTTP_200_OK
    assert response.data['results'] == []

@pytest.mark.django_db
def test_authenticated_task_list(api_client, create_user):
    """Giriş yapmiş kullanici kendi görev listesini görebilir"""
    api_client.force_authenticate(user=create_user)
    response = api_client.get('/api/tasks/')
    assert response.status_code == status.HTTP_200_OK