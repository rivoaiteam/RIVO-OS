"""
URL configuration for WhatsApp API endpoints.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('messages/<uuid:client_id>/', views.get_client_messages, name='whatsapp-client-messages'),
    path('send/', views.send_message, name='whatsapp-send'),
    path('send-template/', views.send_template_message, name='whatsapp-send-template'),
    path('webhook/', views.webhook, name='whatsapp-webhook'),
]
