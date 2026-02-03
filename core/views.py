# # # from rest_framework import viewsets
# # # from .models import Todo
# # # from .serializers import TodoSerializer

# # # class TodoViewSet(viewsets.ModelViewSet):
# # #     queryset = Todo.objects.all()
# # #     serializer_class = TodoSerializer  # Corrigé : pas de virgule ici


# # from rest_framework import viewsets, permissions # Ajoute permissions
# # from .models import Todo
# # from .serializers import TodoSerializer

# # class TodoViewSet(viewsets.ModelViewSet):
# #     queryset = Todo.objects.all()
# #     serializer_class = TodoSerializer
# #     # Cette ligne autorise tout le monde à voir/modifier les todos
# #     permission_classes = [permissions.AllowAny]

from rest_framework import viewsets, permissions
from rest_framework import generics
from .models import Category, Todo
from .serializers import CategorySerializer, TodoSerializer
from django.contrib.auth.models import User
from .serializers import RegisterSerializer

# class TodoViewSet(viewsets.ModelViewSet):
#     serializer_class = TodoSerializer
#     # 1. On exige que l'utilisateur soit connecté
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         """
#         2. Cette méthode filtre les données. 
#         L'utilisateur ne voit QUE ses propres tâches.
#         """
#         return Todo.objects.filter(owner=self.request.user)

#     def perform_create(self, serializer):
#         """
#         3. Quand on crée une tâche, on définit l'owner 
#         automatiquement via l'utilisateur qui a envoyé la requête.
#         """
#         serializer.save(owner=self.request.user)

class TodoViewSet(viewsets.ModelViewSet):
    serializer_class = TodoSerializer
    # Cette ligne force l'utilisateur à être connecté
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # L'utilisateur ne voit QUE ses propres todos
        return Todo.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # On injecte l'utilisateur connecté automatiquement à la création
        serializer.save(user=self.request.user)
    

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,) # Tout le monde peut s'inscrire
    serializer_class = RegisterSerializer


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)

