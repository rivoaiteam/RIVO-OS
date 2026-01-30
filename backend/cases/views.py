"""
API views for Case management.

This module provides ViewSets for case CRUD operations,
stage management, and SLA breach tracking.
"""

import logging
from datetime import timedelta
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from cases.models import Case, Bank, CaseStage, StageSLAConfig, ACTIVE_STAGES, TERMINAL_STAGES, QUERY_STAGES
from cases.serializers import (
    CaseListSerializer,
    CaseDetailSerializer,
    CaseCreateSerializer,
    CaseUpdateSerializer,
    StageChangeSerializer,
    BankListSerializer,
    CaseReassignSerializer,
    SLABreachItemSerializer,
)
from clients.models import Client, ClientStatus
from users.permissions import IsAuthenticated, IsChannelOwnerOrAdmin, CanAccessCases
from audit.models import Note, AuditLog

logger = logging.getLogger(__name__)


class CasePagination(PageNumberPagination):
    """Custom pagination for cases with configurable page size."""
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


class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for case management.

    Provides CRUD operations for cases:
    - GET /cases - List all cases (paginated, with search/filter)
    - POST /cases - Create case
    - GET /cases/{id} - Get case details
    - PATCH /cases/{id} - Update case
    - POST /cases/{id}/change_stage - Change case stage
    - PATCH /cases/{id}/reassign - Reassign case owner (Channel Owner or Admin)

    NO destroy action (no delete per spec).
    """

    queryset = Case.objects.all().select_related(
        'client',
        'client__co_applicant',
        'assigned_to',
    ).order_by('-created_at')
    permission_classes = [IsAuthenticated, CanAccessCases]
    pagination_class = CasePagination

    # Disable delete action
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return CaseListSerializer
        elif self.action == 'create':
            return CaseCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return CaseUpdateSerializer
        elif self.action == 'change_stage':
            return StageChangeSerializer
        elif self.action == 'reassign':
            return CaseReassignSerializer
        return CaseDetailSerializer

    def get_queryset(self):
        """Filter queryset based on query params."""
        queryset = super().get_queryset()

        # Search filter (by client name)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(client__name__icontains=search) |
                Q(client__phone__icontains=search) |
                Q(client__email__icontains=search)
            )

        # Stage filter
        stage = self.request.query_params.get('stage', '').strip()
        if stage:
            if stage == 'active':
                queryset = queryset.filter(stage__in=ACTIVE_STAGES)
            elif stage == 'terminal':
                queryset = queryset.filter(stage__in=TERMINAL_STAGES)
            elif stage == 'on_hold':
                queryset = queryset.filter(stage=CaseStage.ON_HOLD)
            elif stage in CaseStage.values:
                queryset = queryset.filter(stage=stage)

        # Bank filter
        bank = self.request.query_params.get('bank', '').strip()
        if bank:
            queryset = queryset.filter(bank__iexact=bank)

        # Client ID filter
        client_id = self.request.query_params.get('client_id', '').strip()
        if client_id:
            queryset = queryset.filter(client_id=client_id)

        # SLA status filter - uses DB-level filtering where possible
        sla_status_filter = self.request.query_params.get('sla_status', '').strip()
        if sla_status_filter:
            if sla_status_filter == 'completed':
                queryset = queryset.filter(
                    Q(stage__in=TERMINAL_STAGES) | Q(stage=CaseStage.ON_HOLD)
                )
            elif sla_status_filter in ('overdue', 'remaining'):
                # Exclude terminal/on_hold first at DB level
                active_qs = queryset.exclude(
                    Q(stage__in=TERMINAL_STAGES) | Q(stage=CaseStage.ON_HOLD)
                )
                # Pre-warm SLA config cache, then iterate minimal fields
                StageSLAConfig.get_sla_for_stage('')
                now = timezone.now()
                overdue_ids = []
                remaining_ids = []
                for c in active_qs.only('id', 'stage', 'stage_changed_at').iterator():
                    sla_hours = StageSLAConfig.get_sla_for_stage(c.stage)
                    if sla_hours is None:
                        continue
                    deadline = c.stage_changed_at + timedelta(hours=sla_hours)
                    if deadline < now:
                        overdue_ids.append(c.id)
                    else:
                        remaining_ids.append(c.id)
                ids = overdue_ids if sla_status_filter == 'overdue' else remaining_ids
                queryset = queryset.filter(id__in=ids)

        return queryset

    def list(self, request: Request) -> Response:
        """
        List all cases with pagination, search, and stage filter.

        GET /cases?page=1&page_size=10&search=john&stage=processing&bank=emirates
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
        Create a new case.

        POST /cases
        Body: { client_id, property fields, loan fields, bank product fields }

        Validates client eligibility before creating the case.
        Copies application_type from client.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            case = serializer.save()
            return Response(
                CaseDetailSerializer(case).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            logger.error(f'Case creation failed: {str(e)}')
            return Response(
                {'error': f'Failed to create case: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def retrieve(self, request: Request, pk=None) -> Response:
        """
        Get a single case's details.

        GET /cases/{id}
        Returns all case fields plus computed LTV.
        """
        case = self.get_object()
        serializer = CaseDetailSerializer(case)
        return Response(serializer.data)

    def partial_update(self, request: Request, pk=None) -> Response:
        """
        Update a case's fields.

        PATCH /cases/{id}
        Body: { property fields, loan fields, bank product fields }

        Cannot update terminal cases.
        """
        case = self.get_object()

        # Check if case is in terminal stage
        if case.is_terminal:
            return Response(
                {'error': 'Cannot update a case in a terminal stage.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(case, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        try:
            serializer.save()
            return Response(CaseDetailSerializer(case).data)
        except Exception as e:
            logger.error(f'Case update failed: {str(e)}')
            return Response(
                {'error': f'Failed to update case: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def change_stage(self, request: Request, pk=None) -> Response:
        """
        Change the case stage.

        POST /cases/{id}/change_stage
        Body: { stage: 'new_stage' }

        Validates stage transition rules:
        - Cannot transition from terminal stages
        - Updates stage_changed_at timestamp
        """
        case = self.get_object()

        serializer = StageChangeSerializer(
            data=request.data,
            context={'case': case}
        )
        serializer.is_valid(raise_exception=True)

        new_stage = serializer.validated_data['stage']

        try:
            case.change_stage(new_stage)
            return Response(CaseDetailSerializer(case).data)
        except Exception as e:
            logger.error(f'Stage change failed: {str(e)}')
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def stages(self, request: Request) -> Response:
        """
        Get all available stages with their categories.

        GET /cases/stages
        Returns stage choices grouped by category.
        """
        active_stages = [
            {'value': stage.value, 'label': stage.label}
            for stage in CaseStage
            if stage in ACTIVE_STAGES
        ]
        terminal_stages = [
            {'value': stage.value, 'label': stage.label}
            for stage in CaseStage
            if stage in TERMINAL_STAGES
        ]
        hold_stages = [
            {'value': CaseStage.ON_HOLD.value, 'label': CaseStage.ON_HOLD.label}
        ]

        return Response({
            'active': active_stages,
            'hold': hold_stages,
            'terminal': terminal_stages,
        })

    @action(detail=False, methods=['get'])
    def banks(self, request: Request) -> Response:
        """
        Get all active banks for dropdown.

        GET /cases/banks
        Returns list of banks with id, name, and icon.
        """
        banks = Bank.objects.filter(is_active=True).order_by('name')
        serializer = BankListSerializer(banks, many=True)
        return Response(serializer.data)

class SLABreachesView(APIView):
    """
    API view for listing all SLA breaches.

    Channel Owner or Admin endpoint that returns all breached SLAs across:
    - First Contact SLA (Clients)
    - Client-to-Case SLA (Clients with first contact completed)
    - Stage SLA (Cases)

    GET /sla-breaches/?sla_type=all&owner=all
    """
    permission_classes = [IsChannelOwnerOrAdmin]

    def get(self, request: Request) -> Response:
        """
        List all SLA breaches with pagination.

        Query Parameters:
            - sla_type: 'all' | 'first_contact' | 'client_to_case' | 'stage'
            - owner: 'all' | user_id (UUID)
            - page: page number (default 1)
            - page_size: items per page (default 10)
            - search: search by entity name or owner name

        Response: Paginated list of breach items sorted by most overdue first.
        """
        sla_type = request.query_params.get('sla_type', 'all').strip()
        owner_filter = request.query_params.get('owner', 'all').strip()
        search = request.query_params.get('search', '').strip().lower()

        # Pagination params
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 10))
        except ValueError:
            page = 1
            page_size = 10

        breaches = []
        now = timezone.now()

        # Filter by owner if specified
        owner_id = None
        if owner_filter and owner_filter != 'all':
            try:
                owner_id = owner_filter
            except ValueError:
                pass

        # Get First Contact SLA breaches
        if sla_type in ['all', 'first_contact']:
            breaches.extend(self._get_first_contact_breaches(now, owner_id))

        # Get Client-to-Case SLA breaches
        if sla_type in ['all', 'client_to_case']:
            breaches.extend(self._get_client_to_case_breaches(now, owner_id))

        # Get Stage SLA breaches
        if sla_type in ['all', 'stage']:
            breaches.extend(self._get_stage_sla_breaches(now, owner_id))

        # Sort by most overdue first (highest overdue_hours first)
        breaches.sort(key=lambda x: x['overdue_hours'], reverse=True)

        # Apply search filter
        if search:
            breaches = [
                b for b in breaches
                if search in b.get('name', '').lower() or
                   (b.get('assigned_to') and search in b['assigned_to'].name.lower())
            ]

        # Pagination
        total = len(breaches)
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        end = start + page_size
        paginated_breaches = breaches[start:end]

        serializer = SLABreachItemSerializer(paginated_breaches, many=True)
        return Response({
            'items': serializer.data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
        })

    def _get_first_contact_breaches(self, now, owner_id=None):
        """
        Get clients with overdue First Contact SLA.

        Returns clients where:
        - first_contact_completed_at is NULL
        - created_at + SLA minutes < now
        - status is active
        """
        breaches = []

        # Get active clients without first contact completed
        queryset = Client.objects.filter(
            status=ClientStatus.ACTIVE,
            first_contact_completed_at__isnull=True,
        ).select_related('source__channel', 'assigned_to')

        if owner_id:
            queryset = queryset.filter(assigned_to_id=owner_id)

        for client in queryset:
            sla_status = client.first_contact_sla_status
            if sla_status.get('status') == 'overdue':
                remaining_hours = sla_status.get('remaining_hours', 0)
                overdue_hours = abs(remaining_hours) if remaining_hours < 0 else 0

                # Get last activity
                last_activity = self._get_client_last_activity(client)

                breaches.append({
                    'id': client.id,
                    'item_type': 'client',
                    'name': client.name,
                    'identifier': f"Client #{str(client.id)[:8]}",
                    'sla_type': 'first_contact',
                    'sla_type_display': 'First Contact',
                    'assigned_to': client.assigned_to,
                    'overdue_by': sla_status.get('display', ''),
                    'overdue_hours': overdue_hours,
                    'last_activity': last_activity,
                    'stage': None,
                })

        return breaches

    def _get_client_to_case_breaches(self, now, owner_id=None):
        """
        Get clients with overdue Client-to-Case SLA.

        Returns clients where:
        - first_contact_completed_at is set
        - No case exists yet
        - first_contact_completed_at + SLA hours < now
        - status is active
        """
        breaches = []

        # Get clients with first contact completed but no case
        queryset = Client.objects.filter(
            status=ClientStatus.ACTIVE,
            first_contact_completed_at__isnull=False,
        ).select_related('assigned_to').prefetch_related('cases')

        if owner_id:
            queryset = queryset.filter(assigned_to_id=owner_id)

        for client in queryset:
            # Skip if client already has a case
            if client.cases.exists():
                continue

            sla_status = client.client_to_case_sla_status
            if sla_status.get('status') == 'overdue':
                remaining_hours = sla_status.get('remaining_hours', 0)
                overdue_hours = abs(remaining_hours) if remaining_hours < 0 else 0

                # Get last activity
                last_activity = self._get_client_last_activity(client)

                breaches.append({
                    'id': client.id,
                    'item_type': 'client',
                    'name': client.name,
                    'identifier': f"Client #{str(client.id)[:8]}",
                    'sla_type': 'client_to_case',
                    'sla_type_display': 'Client to Case',
                    'assigned_to': client.assigned_to,
                    'overdue_by': sla_status.get('display', ''),
                    'overdue_hours': overdue_hours,
                    'last_activity': last_activity,
                    'stage': None,
                })

        return breaches

    def _get_stage_sla_breaches(self, now, owner_id=None):
        """
        Get cases with overdue Stage SLA.

        Returns cases where:
        - Stage is active (not terminal, not on_hold)
        - stage_changed_at + SLA hours < now
        """
        breaches = []

        # Get active cases
        queryset = Case.objects.filter(
            stage__in=ACTIVE_STAGES
        ).select_related('client', 'assigned_to')

        if owner_id:
            queryset = queryset.filter(assigned_to_id=owner_id)

        for case in queryset:
            sla_status = case.stage_sla_status
            if sla_status.get('status') == 'overdue':
                remaining_hours = sla_status.get('remaining_hours', 0)
                overdue_hours = abs(remaining_hours) if remaining_hours < 0 else 0

                # Get last activity
                last_activity = self._get_case_last_activity(case)

                breaches.append({
                    'id': case.id,
                    'item_type': 'case',
                    'name': case.client.name,
                    'identifier': f"Case #{str(case.id)[:8]}",
                    'sla_type': 'stage',
                    'sla_type_display': f"Stage: {sla_status.get('stage', case.get_stage_display())}",
                    'assigned_to': case.assigned_to,
                    'overdue_by': sla_status.get('display', ''),
                    'overdue_hours': overdue_hours,
                    'last_activity': last_activity,
                    'stage': case.stage,
                })

        return breaches

    def _get_client_last_activity(self, client) -> dict | None:
        """Get the last activity for a client."""
        # Check for latest note
        latest_note = Note.objects.filter(client=client).order_by('-created_at').first()
        if latest_note:
            return {
                'type': 'note',
                'description': 'Note added',
                'time_ago': self._format_time_ago(latest_note.created_at),
            }

        # Check for latest audit log entry
        latest_audit = AuditLog.objects.filter(
            table_name='clients',
            record_id=client.id,
        ).order_by('-timestamp').first()
        if latest_audit:
            action_display = latest_audit.action.lower()
            return {
                'type': 'update',
                'description': f'Client {action_display}d',
                'time_ago': self._format_time_ago(latest_audit.timestamp),
            }

        return {
            'type': 'created',
            'description': 'Created',
            'time_ago': self._format_time_ago(client.created_at),
        }

    def _get_case_last_activity(self, case) -> dict | None:
        """Get the last activity for a case."""
        # Check for latest note
        latest_note = Note.objects.filter(case=case).order_by('-created_at').first()
        if latest_note:
            return {
                'type': 'note',
                'description': 'Note added',
                'time_ago': self._format_time_ago(latest_note.created_at),
            }

        # Check for stage change
        if case.stage_changed_at != case.created_at:
            return {
                'type': 'stage_change',
                'description': f'Stage changed to {case.get_stage_display()}',
                'time_ago': self._format_time_ago(case.stage_changed_at),
            }

        # Check for latest audit log entry
        latest_audit = AuditLog.objects.filter(
            table_name='cases',
            record_id=case.id,
        ).order_by('-timestamp').first()
        if latest_audit:
            action_display = latest_audit.action.lower()
            return {
                'type': 'update',
                'description': f'Case {action_display}d',
                'time_ago': self._format_time_ago(latest_audit.timestamp),
            }

        return {
            'type': 'created',
            'description': 'Created',
            'time_ago': self._format_time_ago(case.created_at),
        }

    def _format_time_ago(self, dt) -> str:
        """Format a datetime as a human-readable time ago string."""
        now = timezone.now()
        diff = now - dt

        if diff.days > 0:
            return f"{diff.days}d ago"
        elif diff.seconds >= 3600:
            hours = diff.seconds // 3600
            return f"{hours}h ago"
        elif diff.seconds >= 60:
            minutes = diff.seconds // 60
            return f"{minutes}m ago"
        else:
            return "Just now"
