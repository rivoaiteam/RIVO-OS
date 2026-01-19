"""
URL configuration for leads app.

This module defines URL patterns for lead management endpoints.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from leads.views import LeadViewSet

# Router for Lead CRUD operations
router = DefaultRouter()
router.register(r'leads', LeadViewSet, basename='lead')

urlpatterns = [
    path('', include(router.urls)),
]
