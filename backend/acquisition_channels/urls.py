"""
URL configuration for channels app.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from acquisition_channels.views import ChannelViewSet, SourceViewSet, SubSourceViewSet

router = DefaultRouter()
router.register(r'channels', ChannelViewSet, basename='channel')
router.register(r'sources', SourceViewSet, basename='source')
router.register(r'sub-sources', SubSourceViewSet, basename='sub-source')

urlpatterns = [
    path('', include(router.urls)),
]
