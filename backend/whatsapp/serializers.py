"""
Serializers for WhatsApp API endpoints.
"""

from rest_framework import serializers
from .models import WhatsAppMessage


class WhatsAppMessageSerializer(serializers.ModelSerializer):
    """Serializer for WhatsApp messages."""

    sent_by_name = serializers.CharField(source='sent_by.name', read_only=True, allow_null=True)

    class Meta:
        model = WhatsAppMessage
        fields = [
            'id',
            'client',
            'direction',
            'message_type',
            'content',
            'status',
            'ycloud_message_id',
            'error_message',
            'from_number',
            'to_number',
            'sent_by',
            'sent_by_name',
            'created_at',
            'sent_at',
            'delivered_at',
        ]
        read_only_fields = [
            'id',
            'ycloud_message_id',
            'error_message',
            'status',
            'sent_by',
            'sent_by_name',
            'created_at',
            'sent_at',
            'delivered_at',
        ]


class SendMessageSerializer(serializers.Serializer):
    """Serializer for sending a WhatsApp message."""

    client_id = serializers.UUIDField(
        help_text='UUID of the client to send the message to'
    )
    message = serializers.CharField(
        max_length=4096,
        help_text='Message content to send'
    )

    def validate_message(self, value):
        """Validate message is not empty."""
        if not value.strip():
            raise serializers.ValidationError('Message cannot be empty')
        return value.strip()
