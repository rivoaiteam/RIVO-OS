"""
WebSocket URL routing for leads.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # WhatsApp chat for specific lead
    re_path(
        r'ws/leads/(?P<lead_id>[0-9a-f-]+)/whatsapp/$',
        consumers.LeadWhatsAppConsumer.as_asgi()
    ),
    # General lead updates (dashboard, individual lead)
    re_path(r'ws/leads/(?P<lead_id>[\w-]+)/$', consumers.LeadConsumer.as_asgi()),
]
