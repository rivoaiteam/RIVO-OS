"""
WebSocket URL routing for WhatsApp real-time messaging.
"""

from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/whatsapp/(?P<client_id>[0-9a-f-]+)/$',
        consumers.WhatsAppConsumer.as_asgi()
    ),
]
