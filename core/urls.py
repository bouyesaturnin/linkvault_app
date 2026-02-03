from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegisterView, TodoViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'todos', TodoViewSet, basename='todo')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    # On enlève 'api/' ici car il est déjà présent dans l'URL du projet
    path('', include(router.urls)), 
]