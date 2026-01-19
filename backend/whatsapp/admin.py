"""
Django admin configuration for WhatsApp models.
"""

from django.contrib import admin
from .models import WhatsAppMessage


@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'client',
        'direction',
        'status',
        'content_preview',
        'sent_by',
        'created_at',
    ]
    list_filter = ['direction', 'status', 'message_type', 'created_at']
    search_fields = ['client__name', 'client__phone', 'content', 'to_number']
    readonly_fields = [
        'id',
        'ycloud_message_id',
        'created_at',
        'sent_at',
        'delivered_at',
    ]
    ordering = ['-created_at']

    def content_preview(self, obj):
        """Show truncated content."""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
