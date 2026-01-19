"""
WebSocket consumers for real-time WhatsApp messaging.
"""

import json
import logging
from uuid import UUID

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from urllib.parse import parse_qs

logger = logging.getLogger(__name__)


class UUIDEncoder(json.JSONEncoder):
    """JSON encoder that handles UUID objects."""

    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)


class WhatsAppConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time WhatsApp message updates.

    Clients connect to ws/whatsapp/{client_id}/ to receive instant
    message updates for a specific client.
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.client_id = self.scope['url_route']['kwargs']['client_id']
        self.room_group_name = f'whatsapp_{self.client_id}'

        # Extract token from query string for authentication
        query_string = self.scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        # Authenticate user
        user = await self.authenticate(token)
        if not user:
            logger.warning(f'WebSocket auth failed for client {self.client_id}')
            await self.close()
            return

        self.user = user

        # Join the client-specific group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f'WebSocket connected for client {self.client_id} by user {user.email}')

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        # Leave the group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f'WebSocket disconnected for client {self.client_id}')

    async def receive_json(self, content):
        """
        Handle incoming WebSocket messages.

        Currently we don't expect client-to-server messages,
        but this could be extended for typing indicators, read receipts, etc.
        """
        message_type = content.get('type')
        logger.debug(f'Received WebSocket message: {message_type}')

    @classmethod
    async def encode_json(cls, content):
        """Encode JSON with UUID support."""
        return json.dumps(content, cls=UUIDEncoder)

    async def whatsapp_message(self, event):
        """
        Handle new WhatsApp message event from channel layer.

        Called when a new message is broadcast from the webhook handler.
        """
        await self.send_json({
            'type': 'new_message',
            'message': event['message']
        })

    async def whatsapp_status_update(self, event):
        """
        Handle message status update event from channel layer.

        Called when a message status is updated (delivered, read, etc.).
        """
        await self.send_json({
            'type': 'status_update',
            'message_id': event['message_id'],
            'status': event['status']
        })

    @database_sync_to_async
    def authenticate(self, token):
        """
        Authenticate user from JWT token.

        Uses the same authentication as the REST API.
        """
        if not token:
            return None

        try:
            from users.authentication import verify_jwt_token
            return verify_jwt_token(token)
        except Exception as e:
            logger.error(f'WebSocket auth error: {e}')
            return None
