"""
URL configuration for channels app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from acquisition_channels.views import ChannelViewSet, SourceViewSet, TeamViewSet

router = DefaultRouter()
router.register(r'channels', ChannelViewSet, basename='channel')
router.register(r'sources', SourceViewSet, basename='source')
router.register(r'teams', TeamViewSet, basename='team')

urlpatterns = [
    path('', include(router.urls)),
]
