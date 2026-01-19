"""
WhatsApp messaging models for Rivo OS.

Stores message history for WhatsApp conversations with clients via YCloud API.
"""

import uuid
from django.db import models


class MessageDirection(models.TextChoices):
    """Direction of the message."""
    OUTBOUND = 'outbound', 'Outbound'
    INBOUND = 'inbound', 'Inbound'


class MessageType(models.TextChoices):
    """Type of WhatsApp message."""
    TEXT = 'text', 'Text'
    TEMPLATE = 'template', 'Template'
    IMAGE = 'image', 'Image'
    DOCUMENT = 'document', 'Document'


class MessageStatus(models.TextChoices):
    """Status of the message."""
    PENDING = 'pending', 'Pending'
    SENT = 'sent', 'Sent'
    DELIVERED = 'delivered', 'Delivered'
    READ = 'read', 'Read'
    FAILED = 'failed', 'Failed'


class WhatsAppMessage(models.Model):
    """
    WhatsApp message model for tracking conversations with clients.

    Stores both outbound (sent by staff) and inbound (received from client) messages.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the message'
    )

    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        related_name='whatsapp_messages',
        help_text='Client this message is associated with'
    )

    direction = models.CharField(
        max_length=10,
        choices=MessageDirection.choices,
        default=MessageDirection.OUTBOUND,
        help_text='Direction of the message (outbound/inbound)'
    )

    message_type = models.CharField(
        max_length=20,
        choices=MessageType.choices,
        default=MessageType.TEXT,
        help_text='Type of message'
    )

    content = models.TextField(
        help_text='Message content/body'
    )

    status = models.CharField(
        max_length=20,
        choices=MessageStatus.choices,
        default=MessageStatus.PENDING,
        help_text='Delivery status of the message'
    )

    # YCloud response data
    ycloud_message_id = models.CharField(
        max_length=255,
        blank=True,
        default='',
        help_text='Message ID from YCloud API response'
    )

    error_message = models.TextField(
        blank=True,
        default='',
        help_text='Error message if sending failed'
    )

    # Phone numbers
    from_number = models.CharField(
        max_length=20,
        help_text='Sender phone number'
    )

    to_number = models.CharField(
        max_length=20,
        help_text='Recipient phone number'
    )

    # Sender (for outbound messages)
    sent_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_whatsapp_messages',
        help_text='User who sent this message (for outbound messages)'
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the message was created'
    )

    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the message was sent to YCloud'
    )

    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the message was delivered'
    )

    class Meta:
        db_table = 'whatsapp_messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['client', 'created_at'], name='wa_client_created_idx'),
            models.Index(fields=['ycloud_message_id'], name='wa_ycloud_msg_idx'),
            models.Index(fields=['status'], name='wa_status_idx'),
        ]

    def __str__(self) -> str:
        return f"WhatsApp {self.direction} to {self.to_number}: {self.content[:50]}..."
