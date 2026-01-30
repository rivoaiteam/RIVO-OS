"""
API views for Channel and Source management.
Admin-only access for most operations.
"""

import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from acquisition_channels.models import Channel, Source
from acquisition_channels.serializers import (
    ChannelSerializer,
    ChannelListSerializer,
    ChannelCreateSerializer,
    ChannelUpdateSerializer,
    SourceSerializer,
    SourceCreateSerializer,
    MSUserSerializer,
)
from users.models import User, UserRole
from users.permissions import IsAdminRole, IsAuthenticated, IsChannelOwnerOrAdmin

logger = logging.getLogger(__name__)


class ChannelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for channel management.
    """

    queryset = Channel.objects.all().order_by('name')

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.role == UserRole.CHANNEL_OWNER:
            return queryset.filter(owner=user)
        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def get_serializer_class(self):
        if self.action == 'list':
            return ChannelListSerializer
        elif self.action == 'create':
            return ChannelCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ChannelUpdateSerializer
        return ChannelSerializer

    def retrieve(self, request, pk=None):
        channel = self.get_object()
        serializer = ChannelSerializer(channel)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_source(self, request, pk=None):
        """Add a source to this channel."""
        channel = self.get_object()
        serializer = SourceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source = Source.objects.create(
            channel=channel,
            name=serializer.validated_data['name'],
            sla_minutes=serializer.validated_data.get('sla_minutes'),
            status=serializer.validated_data.get('status', 'active'),
            linked_user=serializer.validated_data.get('linked_user'),
        )
        return Response(
            SourceSerializer(source).data,
            status=status.HTTP_201_CREATED
        )


class SourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for source management.
    """

    queryset = Source.objects.all().select_related('channel', 'linked_user')

    def get_permissions(self):
        if self.action in ['for_filter', 'ms_users']:
            return [IsAuthenticated()]
        return [IsAdminRole()]

    def get_serializer_class(self):
        return SourceSerializer

    def destroy(self, request, pk=None):
        source = self.get_object()
        lead_count = source.leads.count() if hasattr(source, 'leads') else 0
        client_count = source.clients.count() if hasattr(source, 'clients') else 0
        if lead_count or client_count:
            return Response(
                {'error': 'Cannot delete source.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        source.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def partial_update(self, request, pk=None):
        """Update source name, SLA, status, or linked_user."""
        source = self.get_object()
        source.name = request.data.get('name', source.name)
        source.status = request.data.get('status', source.status)

        if 'sla_minutes' in request.data:
            source.sla_minutes = request.data.get('sla_minutes')

        if 'linked_user' in request.data:
            source.linked_user_id = request.data.get('linked_user')

        source.save()
        return Response(SourceSerializer(source).data)

    @action(detail=False, methods=['get'])
    def for_filter(self, request):
        """
        Get sources for filter dropdowns.

        Query params:
        - trust: 'trusted', 'untrusted', or 'all' (default: 'all')
        """
        trust_filter = request.query_params.get('trust', 'all')

        queryset = Source.objects.select_related(
            'channel'
        ).filter(
            status='active',
            channel__is_active=True
        ).order_by('channel__name', 'name')

        if trust_filter == 'trusted':
            queryset = queryset.filter(channel__is_trusted=True)
        elif trust_filter == 'untrusted':
            queryset = queryset.filter(channel__is_trusted=False)

        result = []
        for source in queryset:
            result.append({
                'id': str(source.id),
                'name': source.name,
                'channel_name': source.channel.name,
                'is_trusted': source.channel.is_trusted,
            })

        return Response(result)

    @action(detail=False, methods=['get'])
    def ms_users(self, request):
        """Get list of MS users for BH Mortgage Team dropdown."""
        ms_users = User.objects.filter(
            role='mortgage_specialist',
            is_active=True
        ).exclude(
            linked_sources__isnull=False
        )
        serializer = MSUserSerializer(ms_users, many=True)
        return Response(serializer.data)


