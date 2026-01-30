"""
URL configuration for channels app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from acquisition_channels.views import ChannelViewSet, SourceViewSet

router = DefaultRouter()
router.register(r'channels', ChannelViewSet, basename='channel')
router.register(r'sources', SourceViewSet, basename='source')

urlpatterns = [
    path('', include(router.urls)),
]
