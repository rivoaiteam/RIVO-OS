"""
URL configuration for Message Templates API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MessageTemplateViewSet

router = DefaultRouter()
router.register(r'message-templates', MessageTemplateViewSet, basename='message-template')

urlpatterns = [
    path('', include(router.urls)),
]
