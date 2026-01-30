"""
API views for Channel and Source management.
Admin-only access for most operations.
"""

import logging
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from acquisition_channels.models import Channel, Source, Team
from acquisition_channels.serializers import (
    ChannelSerializer,
    ChannelListSerializer,
    ChannelCreateSerializer,
    ChannelUpdateSerializer,
    SourceSerializer,
    SourceCreateSerializer,
    MSUserSerializer,
    TeamSerializer,
    TeamCreateUpdateSerializer,
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


class TeamViewSet(viewsets.ModelViewSet):
    """ViewSet for team management."""
    queryset = Team.objects.all().select_related(
        'channel', 'team_leader', 'mortgage_specialist', 'process_officer'
    ).order_by('name')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TeamCreateUpdateSerializer
        return TeamSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        # Admin sees all teams
        if user.role == UserRole.ADMIN:
            return queryset
        # Channel Owner sees only their channels' teams
        if user.role == UserRole.CHANNEL_OWNER:
            return queryset.filter(channel__owner=user)
        # TL/MS/PO see their own team only
        from django.db.models import Q
        return queryset.filter(
            Q(team_leader=user) | Q(mortgage_specialist=user) | Q(process_officer=user)
        )

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'org_chart']:
            return [IsAuthenticated()]
        return [IsChannelOwnerOrAdmin()]

    @action(detail=False, methods=['get'])
    def org_chart(self, request):
        """Return org chart tree: owner -> channels -> teams -> members."""
        from django.db.models import Q, Prefetch

        user = request.user
        teams_prefetch = Prefetch(
            'teams',
            queryset=Team.objects.select_related(
                'team_leader', 'mortgage_specialist', 'process_officer'
            )
        )

        if user.role == UserRole.ADMIN:
            channels = Channel.objects.all().select_related('owner').prefetch_related(teams_prefetch)
        elif user.role == UserRole.CHANNEL_OWNER:
            channels = Channel.objects.filter(owner=user).select_related('owner').prefetch_related(teams_prefetch)
        else:
            team_qs = Team.objects.filter(
                Q(team_leader=user) | Q(mortgage_specialist=user) | Q(process_officer=user)
            ).select_related('channel')
            channel_ids = team_qs.values_list('channel_id', flat=True).distinct()
            channels = Channel.objects.filter(id__in=channel_ids).select_related('owner').prefetch_related(teams_prefetch)

        # Group channels by owner
        owners_map = {}
        unowned = []
        for channel in channels:
            channel_data = {
                'id': str(channel.id),
                'name': channel.name,
                'teams': [],
            }
            for team in channel.teams.filter(is_active=True):
                channel_data['teams'].append({
                    'id': str(team.id),
                    'name': team.name,
                    'team_leader': {'id': str(team.team_leader.id), 'name': team.team_leader.name} if team.team_leader else None,
                    'mortgage_specialist': {'id': str(team.mortgage_specialist.id), 'name': team.mortgage_specialist.name} if team.mortgage_specialist else None,
                    'process_officer': {'id': str(team.process_officer.id), 'name': team.process_officer.name} if team.process_officer else None,
                })
            if channel.owner:
                owner_id = str(channel.owner.id)
                if owner_id not in owners_map:
                    owners_map[owner_id] = {
                        'id': owner_id,
                        'name': channel.owner.name,
                        'channels': [],
                    }
                owners_map[owner_id]['channels'].append(channel_data)
            else:
                unowned.append(channel_data)

        result = list(owners_map.values())
        if unowned:
            result.append({
                'id': None,
                'name': 'Unassigned',
                'channels': unowned,
            })

        return Response(result)
