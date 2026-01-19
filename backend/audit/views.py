"""
API views for Audit, Notes, Activity Timeline, and Reminders.

This module provides:
- Activity timeline endpoints for Client/Case/Lead detail views
- Admin audit log view with filters and export
- Notes CRUD operations
- Reminders management and dashboard endpoints
"""

import csv
import json
import logging
from io import StringIO
from datetime import timedelta
from collections import defaultdict

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.models import AuditLog, Note, Reminder, ReminderStatus, AuditAction, set_audit_user
from audit.serializers import (
    AuditLogSerializer,
    AuditLogExportSerializer,
    NoteReadSerializer,
    NoteCreateSerializer,
    NoteUpdateSerializer,
    ReminderSerializer,
    DashboardReminderSerializer,
    ActivityTimelineGroupSerializer,
)
from users.models import User, UserRole
from users.permissions import IsAuthenticated, IsAdmin

logger = logging.getLogger(__name__)


# Human-readable action templates for activity timeline
ACTION_TEMPLATES = {
    ('CREATE', 'clients'): '{user} created this client',
    ('UPDATE', 'clients'): '{user} updated {fields}',
    ('DELETE', 'clients'): '{user} deleted this client',
    ('CREATE', 'cases'): '{user} created case',
    ('UPDATE', 'cases'): '{user} updated {fields}',
    ('DELETE', 'cases'): '{user} deleted this case',
    ('CREATE', 'leads'): '{user} created this lead',
    ('UPDATE', 'leads'): '{user} updated {fields}',
    ('DELETE', 'leads'): '{user} deleted this lead',
    ('CREATE', 'notes'): '{user} added a note: "{note_preview}"{reminder_info}',
    ('UPDATE', 'notes'): '{user} edited a note',
    ('DELETE', 'notes'): '{user} deleted a note',
    ('CREATE', 'reminders'): '{user} set a reminder',
    ('UPDATE', 'reminders'): '{user} updated a reminder',
    ('DELETE', 'reminders'): '{user} removed a reminder',
    ('CREATE', 'client_documents'): '{user} uploaded {document}',
    ('UPDATE', 'client_documents'): '{user} updated {document}',
    ('DELETE', 'client_documents'): '{user} deleted {document}',
    ('CREATE', 'case_documents'): '{user} uploaded {document}',
    ('UPDATE', 'case_documents'): '{user} updated {document}',
    ('DELETE', 'case_documents'): '{user} deleted {document}',
}

# Field display names for human-readable updates
FIELD_DISPLAY_NAMES = {
    'name': 'name',
    'phone': 'phone number',
    'email': 'email',
    'status': 'status',
    'stage': 'stage',
    'monthly_salary': 'monthly salary',
    'residency': 'residency status',
    'employment_type': 'employment type',
    'property_value': 'property value',
    'loan_amount': 'loan amount',
    'bank': 'bank',
    'rate': 'interest rate',
}


def get_user_name(user_id):
    """Get user name from ID."""
    if not user_id:
        return 'System'
    try:
        user = User.objects.get(pk=user_id)
        return user.name
    except User.DoesNotExist:
        return 'Unknown'


def format_changed_fields(changes):
    """Format changed fields into human-readable string."""
    if not changes:
        return 'details'

    fields = []
    for field_name in changes.keys():
        display_name = FIELD_DISPLAY_NAMES.get(field_name, field_name.replace('_', ' '))
        fields.append(display_name)

    if len(fields) == 0:
        return 'details'
    elif len(fields) == 1:
        return fields[0]
    elif len(fields) == 2:
        return f"{fields[0]} and {fields[1]}"
    else:
        return f"{', '.join(fields[:-1])}, and {fields[-1]}"


def format_action_summary(audit_entry):
    """Convert audit log entry to human-readable action summary."""
    action = audit_entry.action
    table = audit_entry.table_name
    changes = audit_entry.changes or {}
    user_name = get_user_name(audit_entry.user_id)

    template_key = (action, table)
    template = ACTION_TEMPLATES.get(template_key, '{user} performed an action')

    # Format fields for UPDATE actions
    fields = format_changed_fields(changes) if action == 'UPDATE' else ''

    # Format document name for document tables
    document = ''
    if 'document' in table:
        doc_name = changes.get('file_name', {})
        if isinstance(doc_name, dict):
            document = doc_name.get('new', doc_name.get('old', 'a document'))
        else:
            document = doc_name or 'a document'

    # Format note preview for notes
    note_preview = ''
    reminder_info = ''
    if table == 'notes':
        note_text = changes.get('text', '')
        if note_text:
            # Truncate to 50 chars
            note_preview = note_text[:50] + ('...' if len(note_text) > 50 else '')
        # Check if there's a reminder associated with this note
        # Note: We can check if reminder exists by looking at the Note
        try:
            note = Note.objects.get(pk=audit_entry.record_id)
            if hasattr(note, 'reminder') and note.reminder:
                reminder_info = f' (reminder for {note.reminder.reminder_date.strftime("%b %d")})'
        except Note.DoesNotExist:
            pass

    return template.format(user=user_name, fields=fields, document=document, note_preview=note_preview, reminder_info=reminder_info)


def get_action_type(table_name):
    """Determine the action type category for styling."""
    if table_name == 'notes':
        return 'note'
    elif 'document' in table_name:
        return 'document'
    elif table_name in ('clients', 'cases', 'leads'):
        return 'record'
    elif table_name == 'reminders':
        return 'reminder'
    else:
        return 'system'


class AuditLogPagination(PageNumberPagination):
    """Pagination for audit logs."""
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200

    def get_paginated_response(self, data):
        return Response({
            'items': data,
            'total': self.page.paginator.count,
            'page': self.page.number,
            'page_size': self.get_page_size(self.request),
            'total_pages': self.page.paginator.num_pages,
        })


class ActivityTimelineView(APIView):
    """
    View for fetching activity timeline for a specific record.

    Returns audit log entries filtered and formatted for human readability,
    grouped by day.
    """
    permission_classes = [IsAuthenticated]

    def get_related_tables(self, record_type):
        """Get related tables to include in activity timeline."""
        # Note: Reminders are shown as part of notes, not separately
        related = {
            'clients': ['clients', 'notes', 'client_documents'],
            'cases': ['cases', 'notes', 'case_documents'],
            'leads': ['leads', 'notes'],
        }
        return related.get(record_type, [record_type])

    def get_related_record_ids(self, record_type, record_id):
        """Get IDs of related records to include in timeline."""
        related_ids = {record_id}

        # Get notes attached to this record
        note_filter = {f'{record_type[:-1]}': record_id}  # clients -> client
        notes = Note.objects.filter(**note_filter).values_list('id', flat=True)
        related_ids.update(notes)

        # Get reminders for those notes
        reminders = Reminder.objects.filter(note_id__in=notes).values_list('id', flat=True)
        related_ids.update(reminders)

        return related_ids

    def get(self, request, record_type, record_id):
        """
        Get activity timeline for a record.

        GET /api/{record_type}/{record_id}/activity/
        Returns grouped, human-readable activity entries.

        For cases: includes both case AND client activity (unified view)
        For clients: includes only client activity
        """
        valid_types = ['clients', 'cases', 'leads']
        if record_type not in valid_types:
            return Response(
                {'error': f'Invalid record type. Must be one of: {valid_types}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get tables to query
        tables = self.get_related_tables(record_type)
        related_ids = self.get_related_record_ids(record_type, record_id)

        # Build query for audit logs
        query = Q()
        for table in tables:
            if table == record_type:
                # Direct record
                query |= Q(table_name=table, record_id=record_id)
            elif table == 'notes':
                # Notes attached to this record
                query |= Q(table_name=table, record_id__in=related_ids)
            elif table == 'reminders':
                # Reminders for notes on this record
                query |= Q(table_name=table, record_id__in=related_ids)
            elif 'document' in table:
                # Documents - query by table and record
                query |= Q(table_name=table, record_id__in=related_ids)

        # For cases: also include client activity (unified view)
        if record_type == 'cases':
            from cases.models import Case
            try:
                case = Case.objects.get(pk=record_id)
                client_id = case.client_id
                # Add client activity
                client_tables = self.get_related_tables('clients')
                client_related_ids = self.get_related_record_ids('clients', client_id)
                for table in client_tables:
                    if table == 'clients':
                        query |= Q(table_name=table, record_id=client_id)
                    elif table == 'notes':
                        query |= Q(table_name=table, record_id__in=client_related_ids)
                    elif 'document' in table:
                        query |= Q(table_name=table, record_id__in=client_related_ids)
            except Case.DoesNotExist:
                pass

        # Fetch and format entries
        audit_entries = AuditLog.objects.filter(query).order_by('-timestamp')[:100]

        # Group entries by date
        grouped = defaultdict(list)
        for entry in audit_entries:
            date = entry.timestamp.date()
            formatted_entry = {
                'id': entry.id,
                'timestamp': entry.timestamp,
                'user_name': get_user_name(entry.user_id),
                'action_summary': format_action_summary(entry),
                'action_type': get_action_type(entry.table_name),
                'entry_type': entry.action,
                'record_type': entry.table_name,
                'record_id': entry.record_id,
            }
            grouped[date].append(formatted_entry)

        # Convert to list sorted by date
        result = [
            {'date': date, 'entries': entries}
            for date, entries in sorted(grouped.items(), reverse=True)
        ]

        serializer = ActivityTimelineGroupSerializer(result, many=True)
        return Response(serializer.data)


class AdminAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for admin audit log access.

    Provides full access to raw audit log data with filtering and export.
    """
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = AuditLogPagination

    def get_queryset(self):
        """Filter audit logs based on query parameters."""
        queryset = AuditLog.objects.all().order_by('-timestamp')

        # Date range filter
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)

        # Table filter
        table_name = self.request.query_params.get('table_name')
        if table_name:
            queryset = queryset.filter(table_name=table_name)

        # Action filter
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        # User filter
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Search by record_id
        record_id = self.request.query_params.get('record_id')
        if record_id:
            queryset = queryset.filter(record_id=record_id)

        return queryset

    @action(detail=False, methods=['post'])
    def export(self, request):
        """
        Export audit logs to CSV or JSON.

        POST /api/admin/audit-logs/export/
        Body: { format: 'csv'|'json', reason: 'compliance reason', filters... }
        """
        serializer = AuditLogExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        export_format = serializer.validated_data['format']
        reason = serializer.validated_data['reason']

        # Apply filters
        queryset = self.get_queryset()

        if serializer.validated_data.get('date_from'):
            queryset = queryset.filter(
                timestamp__gte=serializer.validated_data['date_from']
            )
        if serializer.validated_data.get('date_to'):
            queryset = queryset.filter(
                timestamp__lte=serializer.validated_data['date_to']
            )
        if serializer.validated_data.get('table_name'):
            queryset = queryset.filter(
                table_name=serializer.validated_data['table_name']
            )
        if serializer.validated_data.get('action'):
            queryset = queryset.filter(
                action=serializer.validated_data['action']
            )
        if serializer.validated_data.get('user_id'):
            queryset = queryset.filter(
                user_id=serializer.validated_data['user_id']
            )

        # Log the export action
        AuditLog.objects.create(
            table_name='audit_logs',
            record_id=request.user.id if hasattr(request, 'user') else None,
            action=AuditAction.CREATE,
            user_id=request.user.id if hasattr(request, 'user') else None,
            changes={
                'export_format': export_format,
                'export_reason': reason,
                'record_count': queryset.count(),
            },
            metadata={
                'action_type': 'EXPORT',
            }
        )

        # Generate export
        if export_format == 'csv':
            return self._export_csv(queryset)
        else:
            return self._export_json(queryset)

    def _export_csv(self, queryset):
        """Generate CSV export."""
        output = StringIO()
        writer = csv.writer(output)

        # Header
        writer.writerow([
            'ID', 'Timestamp', 'Table', 'Record ID', 'Action',
            'User ID', 'Changes', 'Metadata'
        ])

        # Data
        for entry in queryset:
            writer.writerow([
                str(entry.id),
                entry.timestamp.isoformat(),
                entry.table_name,
                str(entry.record_id),
                entry.action,
                str(entry.user_id) if entry.user_id else '',
                json.dumps(entry.changes),
                json.dumps(entry.metadata),
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_log_export.csv"'
        return response

    def _export_json(self, queryset):
        """Generate JSON export."""
        data = []
        for entry in queryset:
            data.append({
                'id': str(entry.id),
                'timestamp': entry.timestamp.isoformat(),
                'table_name': entry.table_name,
                'record_id': str(entry.record_id),
                'action': entry.action,
                'user_id': str(entry.user_id) if entry.user_id else None,
                'changes': entry.changes,
                'metadata': entry.metadata,
            })

        response = HttpResponse(
            json.dumps(data, indent=2),
            content_type='application/json'
        )
        response['Content-Disposition'] = 'attachment; filename="audit_log_export.json"'
        return response


class NoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Note CRUD operations.

    Notes can be attached to Clients, Cases, or Leads.
    Supports optional reminders.
    """
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch', 'delete']

    def get_queryset(self):
        """Filter notes based on context."""
        return Note.objects.select_related('author', 'client', 'case', 'lead')\
            .prefetch_related('reminder')\
            .order_by('-created_at')

    def get_serializer_class(self):
        if self.action == 'create':
            return NoteCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return NoteUpdateSerializer
        return NoteReadSerializer

    def create(self, request, record_type=None, record_id=None):
        """
        Create a note attached to a record.

        POST /api/{record_type}/{record_id}/notes/
        Body: { text, reminder_date?, reminder_time? }
        """
        serializer = NoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Set audit user context (DRF auth happens after middleware)
        user = getattr(request, 'user', None)
        if user and hasattr(user, 'id') and user.id:
            set_audit_user(user.id)

        # Determine which record to attach to
        note_data = {
            'text': serializer.validated_data['text'],
            'author': user,
        }

        if record_type == 'clients':
            note_data['client_id'] = record_id
        elif record_type == 'cases':
            note_data['case_id'] = record_id
        elif record_type == 'leads':
            note_data['lead_id'] = record_id
        else:
            return Response(
                {'error': 'Invalid record type'},
                status=status.HTTP_400_BAD_REQUEST
            )

        note = Note.objects.create(**note_data)

        # Create reminder if date provided
        reminder_date = serializer.validated_data.get('reminder_date')
        if reminder_date:
            Reminder.objects.create(
                note=note,
                reminder_date=reminder_date,
                reminder_time=serializer.validated_data.get('reminder_time'),
            )

        return Response(
            NoteReadSerializer(note).data,
            status=status.HTTP_201_CREATED
        )

    def partial_update(self, request, pk=None):
        """
        Update a note (within 24-hour edit window or by admin).

        PATCH /api/notes/{id}/
        Body: { text?, reminder_date?, reminder_time? }
        """
        try:
            note = Note.objects.get(pk=pk)
        except Note.DoesNotExist:
            return Response(
                {'error': 'Note not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user if hasattr(request, 'user') else None
        if not note.can_edit(user):
            return Response(
                {'error': 'Cannot edit this note. The 24-hour edit window has passed.'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = NoteUpdateSerializer(
            data=request.data,
            context={'note': note, 'user': user}
        )
        serializer.is_valid(raise_exception=True)

        # Update text if provided
        if 'text' in serializer.validated_data:
            note.text = serializer.validated_data['text']
            note.save()

        # Handle reminder updates
        reminder_date = serializer.validated_data.get('reminder_date')
        reminder_time = serializer.validated_data.get('reminder_time')

        if reminder_date is not None:
            if reminder_date:
                # Create or update reminder
                reminder, created = Reminder.objects.get_or_create(note=note)
                reminder.reminder_date = reminder_date
                reminder.reminder_time = reminder_time
                reminder.save()
            else:
                # Remove reminder
                Reminder.objects.filter(note=note).delete()
        elif reminder_time is not None and hasattr(note, 'reminder'):
            # Update just the time
            note.reminder.reminder_time = reminder_time
            note.reminder.save()

        note.refresh_from_db()
        return Response(NoteReadSerializer(note).data)

    def destroy(self, request, pk=None):
        """
        Delete a note (by author or admin).

        DELETE /api/notes/{id}/
        """
        try:
            note = Note.objects.get(pk=pk)
        except Note.DoesNotExist:
            return Response(
                {'error': 'Note not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        user = request.user if hasattr(request, 'user') else None
        if not note.can_delete(user):
            return Response(
                {'error': 'You do not have permission to delete this note.'},
                status=status.HTTP_403_FORBIDDEN
            )

        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReminderViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Reminder operations.

    Provides actions for completing and dismissing reminders.
    """
    serializer_class = ReminderSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch']

    def get_queryset(self):
        return Reminder.objects.select_related('note', 'note__author')\
            .order_by('reminder_date', 'reminder_time')

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark a reminder as completed.

        POST /api/reminders/{id}/complete/
        """
        try:
            reminder = Reminder.objects.get(pk=pk)
        except Reminder.DoesNotExist:
            return Response(
                {'error': 'Reminder not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        reminder.mark_complete()
        return Response(ReminderSerializer(reminder).data)

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        """
        Dismiss a reminder.

        POST /api/reminders/{id}/dismiss/
        """
        try:
            reminder = Reminder.objects.get(pk=pk)
        except Reminder.DoesNotExist:
            return Response(
                {'error': 'Reminder not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        reminder.dismiss()
        return Response(ReminderSerializer(reminder).data)


class DashboardRemindersView(APIView):
    """
    View for fetching reminders due today or overdue for the dashboard.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get pending reminders for current user's dashboard.

        GET /api/dashboard/reminders/
        Returns reminders that are due today or overdue.
        """
        today = timezone.now().date()

        # Get reminders that are pending and due today or overdue
        # Filter by notes authored by current user
        user = request.user if hasattr(request, 'user') else None

        queryset = Reminder.objects.filter(
            status=ReminderStatus.PENDING,
            reminder_date__lte=today,
        ).select_related(
            'note',
            'note__author',
            'note__client',
            'note__case',
            'note__case__client',
            'note__lead',
        ).order_by('reminder_date', 'reminder_time')

        # Optionally filter by user's notes
        if user:
            queryset = queryset.filter(note__author=user)

        serializer = DashboardReminderSerializer(queryset, many=True)
        return Response(serializer.data)
