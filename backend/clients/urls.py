"""
URL configuration for clients app.

This module defines URL patterns for client management endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from clients.views import ClientViewSet

# Router for Client CRUD operations
router = DefaultRouter()
router.register(r'clients', ClientViewSet, basename='client')

urlpatterns = [
    # Client management endpoints (via router)
    path('', include(router.urls)),
]
