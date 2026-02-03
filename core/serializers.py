from rest_framework import serializers

from django.contrib.auth.models import User
from .models import Category, Todo


class TodoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Todo
        fields = ['id', 'title', 'description', 'completed', 'created_at', 'updated_at']
        # On ne met pas 'user' ici car on ne veut pas que le front puisse changer le propriétaire


# serializers.py
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField(required=False, allow_blank=True) # Rends-le optionnel

    class Meta:
        model = User
        fields = ('username', 'password', 'email') # Vérifie bien le pluriel 'fields'

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data.get('email', '')
        )

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'color']

    # On s'assure que l'utilisateur est lié à la création
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)