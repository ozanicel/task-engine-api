from django.contrib import admin
from .models import Category, Task

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display=('id', 'name','owner', 'description')
    search_fields = ('name',)
    list_filter = ('owner',)

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'status','owner', 'created_at')
    list_filter = ('status','owner',)
    search_fields = ('title', 'description')