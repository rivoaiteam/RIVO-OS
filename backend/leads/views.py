"""
API views for lead management.

This module provides ViewSets for lead CRUD operations
and status management actions.
"""

import logging

from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response

from leads.models import Lead, LeadStatus
from leads.serializers import (
    LeadChangeStatusSerializer,
    LeadCreateSerializer,
    LeadDetailSerializer,
    LeadListSerializer,
    LeadUpdateSerializer,
)
from users.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


class LeadPagination(PageNumberPagination):
    """Custom pagination for leads with configurable page size."""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({
            'items': data,
            'total': self.page.paginator.count,
            'page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'total_pages': self.page.paginator.num_pages,
        })


class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for lead management.

    Provides CRUD operations for leads:
    - GET /leads - List all leads (paginated, with search/filter)
    - POST /leads - Create lead
    - GET /leads/{id} - Get lead details
    - PATCH /leads/{id} - Update lead
    - POST /leads/{id}/change_status - Change lead status
    - POST /leads/{id}/convert_to_client - Convert lead to client

    NO destroy action (no delete per spec).
    """

    queryset = Lead.objects.select_related(
        'sub_source__source__channel'
    ).all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    pagination_class = LeadPagination
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return LeadListSerializer
        elif self.action == 'create':
            return LeadCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return LeadUpdateSerializer
        elif self.action == 'change_status':
            return LeadChangeStatusSerializer
        return LeadDetailSerializer

    def get_queryset(self):
        """Filter queryset based on search and status query params."""
        queryset = super().get_queryset()

        # Search filter (name or phone)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(phone__icontains=search)
            )

        # Status filter
        status_filter = self.request.query_params.get('status', '').strip()
        if status_filter and status_filter in LeadStatus.values:
            queryset = queryset.filter(status=status_filter)

        # Sub-source filter
        sub_source_id = self.request.query_params.get('sub_source_id', '').strip()
        if sub_source_id:
            queryset = queryset.filter(sub_source_id=sub_source_id)

        # Channel filter (filter by channel id)
        channel_id = self.request.query_params.get('channel_id', '').strip()
        if channel_id:
            queryset = queryset.filter(sub_source__source__channel_id=channel_id)

        return queryset

    def list(self, request: Request) -> Response:
        """
        List all leads with pagination, search, and status filter.

        GET /leads?page=1&page_size=10&search=john&status=active
        Returns: { items: [...], total, page, page_size, total_pages }
        """
        queryset = self.filter_queryset(self.get_queryset())

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request: Request) -> Response:
        """
        Create a new lead.

        POST /leads
        Body: { name, phone, email?, sub_source_id, intent? }

        Validates that sub_source belongs to an untrusted channel.
        Sets status to 'active' by default.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            lead = serializer.save()
            return Response(
                LeadDetailSerializer(lead).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f'Lead creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to create lead: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk=None) -> Response:
        """
        Get a single lead's details with SLA timer.

        GET /leads/{id}
        """
        lead = self.get_object()
        serializer = self.get_serializer(lead)
        return Response(serializer.data)

    def partial_update(self, request: Request, pk=None) -> Response:
        """
        Update a lead's allowed fields.

        PATCH /leads/{id}
        Body: { name?, phone?, email?, intent? }

        Cannot update leads in terminal status.
        """
        lead = self.get_object()

        if lead.is_terminal:
            return Response(
                {'error': 'Cannot update a lead in terminal status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(lead, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            serializer.save()
            return Response(LeadDetailSerializer(lead).data)
        except Exception as e:
            logger.error(f'Lead update failed: {str(e)}')
            return Response(
                {'error': f'Failed to update lead: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def change_status(self, request: Request, pk=None) -> Response:
        """
        Change a lead's status.

        POST /leads/{id}/change_status
        Body: { status: 'converted' | 'declined' | 'not_proceeding' }

        Cannot change status of terminal leads.
        """
        lead = self.get_object()

        serializer = LeadChangeStatusSerializer(
            data=request.data,
            context={'lead': lead}
        )
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']

        try:
            # Update status (bypass full_clean for status-only changes)
            Lead.objects.filter(pk=lead.pk).update(status=new_status)
            lead.refresh_from_db()

            return Response(LeadDetailSerializer(lead).data)
        except Exception as e:
            logger.error(f'Lead status change failed: {str(e)}')
            return Response(
                {'error': f'Failed to change status: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def convert_to_client(self, request: Request, pk=None) -> Response:
        """
        Convert a lead to a client.

        POST /leads/{id}/convert_to_client

        Creates a new Client record with the lead's data and sets:
        - Lead status to 'converted'
        - Lead.converted_client_id to the new Client's ID

        Only active leads can be converted.
        """
        lead = self.get_object()

        if lead.status != LeadStatus.ACTIVE:
            return Response(
                {'error': 'Only active leads can be converted to clients.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Import here to avoid circular imports
            from clients.models import Client, ClientStatus

            # Create client from lead data
            client = Client.objects.create(
                name=lead.name,
                phone=lead.phone,
                email=lead.email,
                sub_source=lead.sub_source,
                converted_from_lead=lead,
                notes=lead.intent,
                status=ClientStatus.ACTIVE,
            )

            # Link lead to client via UUID (is_terminal will return True)
            Lead.objects.filter(pk=lead.pk).update(
                converted_client_id=client.id
            )
            lead.refresh_from_db()

            return Response({
                'message': 'Lead converted to client successfully.',
                'lead': LeadDetailSerializer(lead).data,
                'client_id': str(client.id)
            })
        except ImportError:
            # Client model doesn't exist yet
            return Response(
                {'error': 'Client model not yet implemented.'},
                status=status.HTTP_501_NOT_IMPLEMENTED
            )
        except Exception as e:
            logger.error(f'Lead conversion failed: {str(e)}')
            return Response(
                {'error': f'Failed to convert lead: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request: Request, pk=None) -> Response:
        """
        Delete is not allowed for leads.

        DELETE /leads/{id} - Returns 405 Method Not Allowed
        """
        return Response(
            {'error': 'Leads cannot be deleted.'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
