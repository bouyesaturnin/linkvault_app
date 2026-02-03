from django.db import models
from django.contrib.auth.models import User # Import important !


class Category(models.Model):
    name = models.CharField(max_length=50)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    color = models.CharField(max_length=7, default="#6366f1") # Pour stocker un code couleur hex

    def __str__(self):
        return self.name

class Todo(models.Model):
    # Cette ligne crée le lien entre la tâche et l'utilisateur
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="todos")
    # ... tes autres champs ...
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="todos")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']

