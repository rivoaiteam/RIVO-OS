"""
API views for WhatsApp messaging.
"""

import logging
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from users.permissions import IsAuthenticated

from clients.models import Client
from .models import WhatsAppMessage, MessageDirection, MessageStatus
from .serializers import WhatsAppMessageSerializer, SendMessageSerializer
from .services import ycloud_service, YCloudError, verify_webhook_signature

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_client_messages(request, client_id):
    """
    Get all WhatsApp messages for a specific client.
    Syncs delivery/read status from YCloud for outbound messages.

    GET /api/whatsapp/messages/{client_id}/
    """
    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        return Response(
            {'error': 'Client not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    messages = WhatsAppMessage.objects.filter(client=client).order_by('created_at')

    # Sync status from YCloud for outbound messages that aren't read/failed yet
    for msg in messages:
        if (msg.direction == MessageDirection.OUTBOUND and
            msg.ycloud_message_id and
            msg.status not in [MessageStatus.READ, MessageStatus.FAILED]):
            try:
                ycloud_data = ycloud_service.get_message_status(msg.ycloud_message_id)
                ycloud_status = ycloud_data.get('status', '').lower()

                # Map YCloud status to our status
                status_map = {
                    'sent': MessageStatus.SENT,
                    'delivered': MessageStatus.DELIVERED,
                    'read': MessageStatus.READ,
                    'failed': MessageStatus.FAILED,
                }

                if ycloud_status in status_map:
                    new_status = status_map[ycloud_status]
                    if msg.status != new_status:
                        msg.status = new_status
                        # Update delivered_at timestamp if available
                        if ycloud_data.get('deliverTime'):
                            from django.utils.dateparse import parse_datetime
                            msg.delivered_at = parse_datetime(ycloud_data['deliverTime'])
                        msg.save()
                        logger.info(f'Updated message {msg.id} status to {new_status}')

            except YCloudError as e:
                logger.warning(f'Failed to sync status for message {msg.id}: {e.message}')

    # Refresh queryset after updates
    messages = WhatsAppMessage.objects.filter(client=client).order_by('created_at')
    serializer = WhatsAppMessageSerializer(messages, many=True)

    return Response({
        'client_id': str(client_id),
        'client_name': client.name,
        'client_phone': client.phone,
        'messages': serializer.data,
        'count': messages.count()
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """
    Send a WhatsApp message to a client.

    POST /api/whatsapp/send/
    Body: { "client_id": "uuid", "message": "Hello!" }
    """
    serializer = SendMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    client_id = serializer.validated_data['client_id']
    message_content = serializer.validated_data['message']

    # Get the client
    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        return Response(
            {'error': 'Client not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate client has a phone number
    if not client.phone:
        return Response(
            {'error': 'Client does not have a phone number'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the message record
    whatsapp_message = WhatsAppMessage.objects.create(
        client=client,
        direction=MessageDirection.OUTBOUND,
        content=message_content,
        status=MessageStatus.PENDING,
        from_number=ycloud_service.from_number,
        to_number=client.phone,
        sent_by=request.user if hasattr(request, 'user') else None,
    )

    # Send via YCloud
    try:
        ycloud_response = ycloud_service.send_text_message(
            to_number=client.phone,
            message=message_content
        )

        # Update message with success
        whatsapp_message.ycloud_message_id = ycloud_response.get('id', '')
        whatsapp_message.status = MessageStatus.SENT
        whatsapp_message.sent_at = timezone.now()
        whatsapp_message.save()

        logger.info(f'WhatsApp message sent to client {client_id}: {whatsapp_message.id}')

        return Response({
            'success': True,
            'message': WhatsAppMessageSerializer(whatsapp_message).data,
            'ycloud_response': ycloud_response
        }, status=status.HTTP_201_CREATED)

    except YCloudError as e:
        # Update message with failure
        whatsapp_message.status = MessageStatus.FAILED
        whatsapp_message.error_message = e.message
        whatsapp_message.save()

        logger.error(f'Failed to send WhatsApp message to client {client_id}: {e.message}')

        return Response({
            'success': False,
            'error': e.message,
            'message': WhatsAppMessageSerializer(whatsapp_message).data
        }, status=status.HTTP_502_BAD_GATEWAY)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_template_message(request):
    """
    Send a WhatsApp template message to a client.
    Use this for initial contact (before 24-hour window is open).

    POST /api/whatsapp/send-template/
    Body: {
        "client_id": "uuid",
        "template_name": "my_segmentation_v1",
        "language_code": "en" (optional, default: en)
    }
    """
    client_id = request.data.get('client_id')
    template_name = request.data.get('template_name')
    language_code = request.data.get('language_code', 'en')

    if not client_id or not template_name:
        return Response(
            {'error': 'client_id and template_name are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get the client
    try:
        client = Client.objects.get(pk=client_id)
    except Client.DoesNotExist:
        return Response(
            {'error': 'Client not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Validate client has a phone number
    if not client.phone:
        return Response(
            {'error': 'Client does not have a phone number'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create the message record
    from .models import MessageType
    whatsapp_message = WhatsAppMessage.objects.create(
        client=client,
        direction=MessageDirection.OUTBOUND,
        message_type=MessageType.TEMPLATE,
        content=f'[Template: {template_name}]',
        status=MessageStatus.PENDING,
        from_number=ycloud_service.from_number,
        to_number=client.phone,
        sent_by=request.user if hasattr(request, 'user') else None,
    )

    # Send via YCloud
    try:
        ycloud_response = ycloud_service.send_template_message(
            to_number=client.phone,
            template_name=template_name,
            language_code=language_code
        )

        # Update message with success
        whatsapp_message.ycloud_message_id = ycloud_response.get('id', '')
        whatsapp_message.status = MessageStatus.SENT
        whatsapp_message.sent_at = timezone.now()
        whatsapp_message.save()

        logger.info(f'WhatsApp template "{template_name}" sent to client {client_id}: {whatsapp_message.id}')

        return Response({
            'success': True,
            'message': WhatsAppMessageSerializer(whatsapp_message).data,
            'ycloud_response': ycloud_response
        }, status=status.HTTP_201_CREATED)

    except YCloudError as e:
        # Update message with failure
        whatsapp_message.status = MessageStatus.FAILED
        whatsapp_message.error_message = e.message
        whatsapp_message.save()

        logger.error(f'Failed to send WhatsApp template to client {client_id}: {e.message}')

        return Response({
            'success': False,
            'error': e.message,
            'message': WhatsAppMessageSerializer(whatsapp_message).data
        }, status=status.HTTP_502_BAD_GATEWAY)


@csrf_exempt
@api_view(['POST'])
@permission_classes([])  # No auth - YCloud calls this endpoint
def webhook(request):
    """
    YCloud webhook for receiving inbound WhatsApp messages and status updates.

    POST /api/whatsapp/webhook/

    Events handled:
    - whatsapp.inbound_message.received: Customer sends a message
    - whatsapp.message.updated: Message status updates (delivered, read, etc.)
    """
    # Verify webhook signature (if secret is configured)
    signature_header = request.headers.get('YCloud-Signature', '')
    if not verify_webhook_signature(request.body, signature_header):
        logger.warning('Webhook signature verification failed')
        # Still process for now, but log the warning
        # In production, you may want to reject: return Response(status=status.HTTP_401_UNAUTHORIZED)

    try:
        payload = request.data
        event_type = payload.get('type', '')

        logger.info(f'Received webhook event: {event_type}')

        if event_type == 'whatsapp.inbound_message.received':
            return handle_inbound_message(payload)
        elif event_type == 'whatsapp.message.updated':
            return handle_message_status_update(payload)
        else:
            logger.info(f'Unhandled webhook event type: {event_type}')
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f'Webhook processing error: {str(e)}')
        # Always return 200 to prevent YCloud from retrying
        return Response({'status': 'error', 'message': str(e)}, status=status.HTTP_200_OK)


def handle_inbound_message(payload):
    """
    Handle incoming WhatsApp message from customer.

    Payload structure:
    {
      "id": "evt_xxx",
      "type": "whatsapp.inbound_message.received",
      "whatsappInboundMessage": {
        "id": "wim123",
        "from": "+917700098657",
        "to": "+918138020960",
        "customerProfile": {"name": "John"},
        "sendTime": "2026-01-19T12:00:00.000Z",
        "type": "text",
        "text": {"body": "Hello!"}
      }
    }
    """
    inbound_msg = payload.get('whatsappInboundMessage', {})

    from_number = inbound_msg.get('from', '')
    to_number = inbound_msg.get('to', '')
    message_type = inbound_msg.get('type', 'text')
    ycloud_message_id = inbound_msg.get('id', '')
    send_time = inbound_msg.get('sendTime')
    customer_profile = inbound_msg.get('customerProfile', {})
    customer_name = customer_profile.get('name', '')

    # Extract message content based on type
    if message_type == 'text':
        content = inbound_msg.get('text', {}).get('body', '')
    elif message_type == 'image':
        content = '[Image]'
    elif message_type == 'document':
        content = '[Document]'
    elif message_type == 'audio':
        content = '[Audio]'
    elif message_type == 'video':
        content = '[Video]'
    else:
        content = f'[{message_type}]'

    logger.info(f'Inbound message from {from_number}: {content[:50]}...')

    # Find client by phone number (normalize phone number for matching)
    normalized_phone = normalize_phone_for_lookup(from_number)
    client = find_client_by_phone(normalized_phone)

    if not client:
        logger.warning(f'No client found for phone number: {from_number}')
        # Still save the message but without a client link
        # Or you could create a new client here
        return Response({
            'status': 'warning',
            'message': f'No client found for phone {from_number}'
        }, status=status.HTTP_200_OK)

    # Check for duplicate message
    if WhatsAppMessage.objects.filter(ycloud_message_id=ycloud_message_id).exists():
        logger.info(f'Duplicate message ignored: {ycloud_message_id}')
        return Response({'status': 'duplicate'}, status=status.HTTP_200_OK)

    # Create the message record
    whatsapp_message = WhatsAppMessage.objects.create(
        client=client,
        direction=MessageDirection.INBOUND,
        content=content,
        status=MessageStatus.DELIVERED,  # Inbound messages are already delivered
        ycloud_message_id=ycloud_message_id,
        from_number=from_number,
        to_number=to_number,
        sent_at=parse_datetime(send_time) if send_time else timezone.now(),
        delivered_at=timezone.now(),
    )

    logger.info(f'Saved inbound message {whatsapp_message.id} for client {client.id}')

    # Broadcast to WebSocket for real-time update
    broadcast_message_to_websocket(client.id, whatsapp_message)

    return Response({
        'status': 'success',
        'message_id': str(whatsapp_message.id)
    }, status=status.HTTP_200_OK)


def handle_message_status_update(payload):
    """
    Handle message status update (delivered, read, failed).

    This updates existing outbound messages with delivery status.
    """
    message_data = payload.get('whatsappMessage', {})
    ycloud_message_id = message_data.get('id', '')
    new_status = message_data.get('status', '').lower()

    if not ycloud_message_id:
        return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

    try:
        message = WhatsAppMessage.objects.get(ycloud_message_id=ycloud_message_id)

        status_map = {
            'sent': MessageStatus.SENT,
            'delivered': MessageStatus.DELIVERED,
            'read': MessageStatus.READ,
            'failed': MessageStatus.FAILED,
        }

        if new_status in status_map:
            message.status = status_map[new_status]
            if new_status == 'delivered':
                message.delivered_at = timezone.now()
            message.save()
            logger.info(f'Updated message {message.id} status to {new_status}')

        return Response({'status': 'success'}, status=status.HTTP_200_OK)

    except WhatsAppMessage.DoesNotExist:
        logger.warning(f'Message not found for status update: {ycloud_message_id}')
        return Response({'status': 'not_found'}, status=status.HTTP_200_OK)


def normalize_phone_for_lookup(phone: str) -> str:
    """
    Normalize phone number for database lookup.
    Removes +, spaces, dashes, etc.
    """
    return ''.join(c for c in phone if c.isdigit())


def find_client_by_phone(normalized_phone: str):
    """
    Find a client by phone number.
    Tries various formats to match.
    """
    # Try exact match first
    client = Client.objects.filter(phone__icontains=normalized_phone[-10:]).first()
    if client:
        return client

    # Try with country code variations
    for client in Client.objects.all():
        if client.phone:
            client_normalized = ''.join(c for c in client.phone if c.isdigit())
            # Match last 10 digits (local number without country code)
            if client_normalized[-10:] == normalized_phone[-10:]:
                return client

    return None


def broadcast_message_to_websocket(client_id, whatsapp_message):
    """
    Broadcast a new WhatsApp message to connected WebSocket clients.

    This sends the message to all users viewing the WhatsApp tab for this client.
    """
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer is None:
            logger.warning('Channel layer not available for WebSocket broadcast')
            return

        # Serialize the message
        message_data = WhatsAppMessageSerializer(whatsapp_message).data

        # Broadcast to the client-specific group
        async_to_sync(channel_layer.group_send)(
            f'whatsapp_{client_id}',
            {
                'type': 'whatsapp_message',
                'message': message_data
            }
        )

        logger.info(f'Broadcast message {whatsapp_message.id} to WebSocket group whatsapp_{client_id}')

    except Exception as e:
        logger.error(f'Failed to broadcast to WebSocket: {e}')
