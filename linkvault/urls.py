from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
# Importe ta vue de register ici (adapte le 'core' selon le nom de ton app)
from core.views import RegisterView 

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Authentification (C'est ici que se trouvaient les 404 !)
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/register/', RegisterView.as_view(), name='auth_register'),
    
    # Tes Todos
    path('api/', include('core.urls')), 
]
