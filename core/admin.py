from django.contrib import admin
from .models import Category, Todo
# Register your models here.


class TodoAdmin(admin.ModelAdmin):
    list_display = ('title', 'description', 'completed', 'created_at', 'updated_at')

admin.site.register(Todo, TodoAdmin)


class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'color', 'user')
    
admin.site.register(Category, CategoryAdmin)