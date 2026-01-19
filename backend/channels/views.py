"""
API views for Channel, Source, and Sub-source management.
Admin-only access for all operations.
"""

import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from channels.models import Channel, Source, SubSource
from channels.serializers import (
    ChannelSerializer,
    ChannelListSerializer,
    ChannelCreateSerializer,
    ChannelUpdateSerializer,
    SourceSerializer,
    SourceListSerializer,
    SourceCreateSerializer,
    SubSourceSerializer,
    SubSourceCreateSerializer,
    MSUserSerializer,
)
from users.models import User
from users.permissions import IsAdminRole, IsAuthenticated

logger = logging.getLogger(__name__)


class ChannelViewSet(viewsets.ModelViewSet):
    """
    ViewSet for channel management.

    GET /channels - List all channels (Authenticated users)
    POST /channels - Create channel (Admin only)
    GET /channels/{id} - Get channel with sources and sub-sources (Authenticated users)
    PATCH /channels/{id} - Update channel (Admin only)
    DELETE /channels/{id} - Delete channel (Admin only)
    """

    queryset = Channel.objects.all().order_by('name')

    def get_permissions(self):
        """Allow read access to all authenticated users, write access to admins only."""
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
        """Get channel with all sources and sub-sources."""
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
            name=serializer.validated_data['name']
        )
        return Response(
            SourceSerializer(source).data,
            status=status.HTTP_201_CREATED
        )


class SourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for source management (Admin only).

    GET /sources - List all sources
    GET /sources/{id} - Get source with sub-sources
    PATCH /sources/{id} - Update source
    DELETE /sources/{id} - Delete source
    POST /sources/{id}/add_sub_source - Add sub-source
    """

    queryset = Source.objects.all().select_related('channel').prefetch_related('sub_sources')
    permission_classes = [IsAdminRole]

    def get_serializer_class(self):
        if self.action == 'list':
            return SourceListSerializer
        return SourceSerializer

    def partial_update(self, request, pk=None):
        """Update source name, SLA, or status."""
        source = self.get_object()
        source.name = request.data.get('name', source.name)
        source.is_active = request.data.get('is_active', source.is_active)

        # Handle sla_minutes - can be set to null to inherit from channel
        if 'sla_minutes' in request.data:
            source.sla_minutes = request.data.get('sla_minutes')

        source.save()
        return Response(SourceSerializer(source).data)

    @action(detail=True, methods=['post'])
    def add_sub_source(self, request, pk=None):
        """Add a sub-source to this source."""
        source = self.get_object()
        serializer = SubSourceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        sub_source = SubSource.objects.create(
            source=source,
            name=serializer.validated_data['name'],
            sla_minutes=serializer.validated_data.get('sla_minutes'),
            linked_user=serializer.validated_data.get('linked_user'),
            status=serializer.validated_data.get('status', 'active')
        )
        return Response(
            SubSourceSerializer(sub_source).data,
            status=status.HTTP_201_CREATED
        )


class SubSourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for sub-source management (Admin only).

    GET /sub-sources/{id} - Get sub-source details
    PATCH /sub-sources/{id} - Update sub-source
    DELETE /sub-sources/{id} - Delete sub-source
    """

    queryset = SubSource.objects.all().select_related('source__channel', 'linked_user')
    permission_classes = [IsAdminRole]
    serializer_class = SubSourceSerializer

    def partial_update(self, request, pk=None):
        """Update sub-source."""
        sub_source = self.get_object()
        sub_source.name = request.data.get('name', sub_source.name)
        sub_source.status = request.data.get('status', sub_source.status)

        # Handle sla_minutes - can be set to null to inherit from source/channel
        if 'sla_minutes' in request.data:
            sub_source.sla_minutes = request.data.get('sla_minutes')

        if 'linked_user' in request.data:
            sub_source.linked_user_id = request.data.get('linked_user')

        sub_source.save()
        return Response(SubSourceSerializer(sub_source).data)

    @action(detail=False, methods=['get'])
    def ms_users(self, request):
        """Get list of MS users for BH Mortgage Team dropdown."""
        ms_users = User.objects.filter(
            role='mortgage_specialist',
            is_active=True
        ).exclude(
            linked_sub_sources__isnull=False
        )
        serializer = MSUserSerializer(ms_users, many=True)
        return Response(serializer.data)
