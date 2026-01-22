"""
WebSocket consumer for real-time lead updates.

Provides real-time updates for:
- Individual lead changes (tags, status, new responses)
- Campaign dashboard updates (new leads, status changes)
"""

import json
import logging
from uuid import UUID

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class UUIDEncoder(json.JSONEncoder):
    """JSON encoder that handles UUID serialization."""
    def default(self, obj):
        if isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)


class LeadConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time lead updates.

    Connect to:
    - ws/leads/{lead_id}/ - Updates for specific lead
    - ws/leads/dashboard/ - All campaign lead updates
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.lead_id = self.scope['url_route']['kwargs'].get('lead_id')

        # Determine which group to join
        if self.lead_id == 'dashboard':
            self.room_group_name = 'campaign_leads'
        else:
            self.room_group_name = f'leads_{self.lead_id}'

        # Authenticate user
        from urllib.parse import parse_qs
        query_string = self.scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        user = await self.authenticate(token)
        if not user:
            logger.warning(f'Lead WebSocket auth failed for {self.lead_id}')
            await self.close()
            return

        self.user = user

        # Join the group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f'Lead WebSocket connected: {self.room_group_name} by user {user}')

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f'Lead WebSocket disconnected: {self.room_group_name}')

    @classmethod
    async def encode_json(cls, content):
        """Encode content to JSON with UUID support."""
        return json.dumps(content, cls=UUIDEncoder)

    async def receive_json(self, content):
        """Handle incoming WebSocket messages (if needed)."""
        # Currently, this is a one-way channel (server -> client)
        # But we could add client-initiated actions here
        pass

    async def lead_update(self, event):
        """
        Handle lead update broadcast.

        Called when a lead is updated (new response, tag change, status change).
        """
        await self.send_json({
            'type': 'lead_update',
            'event': event.get('event'),
            'lead': event.get('lead')
        })

    async def lead_new_response(self, event):
        """Handle new lead response notification."""
        await self.send_json({
            'type': 'new_response',
            'lead': event.get('lead'),
            'message': event.get('message')
        })

    async def lead_tag_change(self, event):
        """Handle lead tag change notification."""
        await self.send_json({
            'type': 'tag_change',
            'lead': event.get('lead'),
            'old_tags': event.get('old_tags'),
            'new_tags': event.get('new_tags'),
            'changed_tag': event.get('changed_tag')
        })

    @database_sync_to_async
    def authenticate(self, token):
        """Authenticate user from JWT token."""
        if not token:
            return None

        try:
            from users.authentication import verify_jwt_token
            return verify_jwt_token(token)
        except Exception as e:
            logger.error(f'Lead WebSocket auth error: {e}')
            return None


class LeadWhatsAppConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time WhatsApp chat updates for leads.

    Connect to: ws/leads/{lead_id}/whatsapp/

    Handles:
    - new_message: When a new message is sent or received
    - status_update: When message status changes (sent, delivered, read)
    """

    async def connect(self):
        """Handle WebSocket connection."""
        self.lead_id = self.scope['url_route']['kwargs'].get('lead_id')
        self.room_group_name = f'lead_whatsapp_{self.lead_id}'

        # Authenticate user
        from urllib.parse import parse_qs
        query_string = self.scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        user = await self.authenticate(token)
        if not user:
            logger.warning(f'LeadWhatsApp WebSocket auth failed for lead {self.lead_id}')
            await self.close()
            return

        self.user = user

        # Verify lead exists
        lead_exists = await self.verify_lead_exists(self.lead_id)
        if not lead_exists:
            logger.warning(f'LeadWhatsApp WebSocket: Lead {self.lead_id} not found')
            await self.close()
            return

        # Join the group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f'LeadWhatsApp WebSocket connected: {self.room_group_name} by user {user}')

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            logger.info(f'LeadWhatsApp WebSocket disconnected: {self.room_group_name}')

    @classmethod
    async def encode_json(cls, content):
        """Encode content to JSON with UUID support."""
        return json.dumps(content, cls=UUIDEncoder)

    async def receive_json(self, content):
        """Handle incoming WebSocket messages."""
        # Currently one-way (server -> client)
        # Could add client ping/pong or typing indicators here
        pass

    async def lead_message(self, event):
        """
        Handle new message broadcast.

        Called when a message is sent or received for this lead.
        """
        await self.send_json({
            'type': 'new_message',
            'message': event['message']
        })

    async def lead_message_status(self, event):
        """
        Handle message status update.

        Called when a message status changes (sent, delivered, read, failed).
        """
        await self.send_json({
            'type': 'status_update',
            'message_id': event.get('message_id'),
            'status': event.get('status')
        })

    @database_sync_to_async
    def authenticate(self, token):
        """Authenticate user from JWT token."""
        if not token:
            return None

        try:
            from users.authentication import verify_jwt_token
            return verify_jwt_token(token)
        except Exception as e:
            logger.error(f'LeadWhatsApp WebSocket auth error: {e}')
            return None

    @database_sync_to_async
    def verify_lead_exists(self, lead_id):
        """Verify that the lead exists."""
        try:
            from leads.models import Lead
            return Lead.objects.filter(id=lead_id).exists()
        except Exception:
            return False
