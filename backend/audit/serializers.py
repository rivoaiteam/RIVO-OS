"""
Serializers for Audit, Notes, and Reminders.

This module provides serializers for:
- Activity timeline (human-readable view)
- Admin audit log (raw view)
- Notes CRUD
- Reminders management
"""

from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta

from audit.models import AuditLog, Note, Reminder, ReminderStatus
from users.models import User


class UserSummarySerializer(serializers.ModelSerializer):
    """Minimal user info for display in activity entries."""

    class Meta:
        model = User
        fields = ['id', 'name', 'email']


class ReminderSerializer(serializers.ModelSerializer):
    """Serializer for reminder data."""
    is_overdue = serializers.BooleanField(read_only=True)
    is_due_today = serializers.BooleanField(read_only=True)

    class Meta:
        model = Reminder
        fields = [
            'id',
            'reminder_date',
            'reminder_time',
            'status',
            'completed_at',
            'is_overdue',
            'is_due_today',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'completed_at', 'created_at', 'updated_at']


class NoteReadSerializer(serializers.ModelSerializer):
    """Serializer for reading note details."""
    author = UserSummarySerializer(read_only=True)
    reminder = ReminderSerializer(read_only=True)
    is_editable = serializers.BooleanField(read_only=True)
    notable_type = serializers.CharField(read_only=True)
    notable_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = Note
        fields = [
            'id',
            'text',
            'notable_type',
            'notable_id',
            'author',
            'reminder',
            'is_editable',
            'created_at',
            'updated_at',
        ]


class NoteCreateSerializer(serializers.Serializer):
    """Serializer for creating notes."""
    text = serializers.CharField(max_length=2000)
    reminder_date = serializers.DateField(required=False, allow_null=True)
    reminder_time = serializers.TimeField(required=False, allow_null=True)

    def validate(self, attrs):
        """Validate reminder time requires date."""
        reminder_time = attrs.get('reminder_time')
        reminder_date = attrs.get('reminder_date')

        if reminder_time and not reminder_date:
            raise serializers.ValidationError({
                'reminder_time': 'Reminder date is required when setting a time.'
            })

        return attrs


class NoteUpdateSerializer(serializers.Serializer):
    """Serializer for updating notes."""
    text = serializers.CharField(max_length=2000, required=False)
    reminder_date = serializers.DateField(required=False, allow_null=True)
    reminder_time = serializers.TimeField(required=False, allow_null=True)

    def validate(self, attrs):
        """Validate edit window and reminder time."""
        note = self.context.get('note')

        if note and not note.is_editable:
            user = self.context.get('user')
            if not (user and hasattr(user, 'is_admin') and user.is_admin):
                raise serializers.ValidationError(
                    'Note can no longer be edited. The 24-hour edit window has passed.'
                )

        reminder_time = attrs.get('reminder_time')
        reminder_date = attrs.get('reminder_date')

        if reminder_time and not reminder_date:
            # Check if note already has a reminder with a date
            if not (note and hasattr(note, 'reminder') and note.reminder):
                raise serializers.ValidationError({
                    'reminder_time': 'Reminder date is required when setting a time.'
                })

        return attrs


class FieldChangeSerializer(serializers.Serializer):
    """Serializer for individual field change details."""
    field = serializers.CharField()
    field_display = serializers.CharField()
    old_value = serializers.JSONField(allow_null=True)
    new_value = serializers.JSONField(allow_null=True)
    old_display = serializers.CharField()
    new_display = serializers.CharField()


class ActivityTimelineEntrySerializer(serializers.Serializer):
    """Serializer for activity timeline entries (human-readable)."""
    id = serializers.UUIDField()
    timestamp = serializers.DateTimeField()
    time_display = serializers.SerializerMethodField()
    user_name = serializers.CharField()
    action_summary = serializers.CharField()
    action_type = serializers.CharField()  # 'note', 'system', 'document', etc.
    entry_type = serializers.CharField()   # Original action type: CREATE, UPDATE, DELETE
    record_type = serializers.CharField(allow_null=True)
    record_id = serializers.UUIDField(allow_null=True)
    changes = FieldChangeSerializer(many=True, allow_null=True, required=False)

    def get_time_display(self, obj):
        """Format time as human-readable (e.g., '2:30 PM')."""
        timestamp = obj.get('timestamp')
        if timestamp:
            return timestamp.strftime('%I:%M %p').lstrip('0')
        return ''


class ActivityTimelineGroupSerializer(serializers.Serializer):
    """Serializer for activity timeline grouped by day."""
    date = serializers.DateField()
    date_display = serializers.SerializerMethodField()
    entries = ActivityTimelineEntrySerializer(many=True)

    def get_date_display(self, obj):
        """Format date with relative labels (Today, Yesterday, or date)."""
        date = obj.get('date')
        if not date:
            return ''

        today = timezone.now().date()
        yesterday = today - timedelta(days=1)

        if date == today:
            return 'Today'
        elif date == yesterday:
            return 'Yesterday'
        else:
            return date.strftime('%B %d, %Y')


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for admin audit log view (raw data)."""
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'table_name',
            'record_id',
            'action',
            'user_id',
            'user_name',
            'timestamp',
            'changes',
            'metadata',
        ]

    def get_user_name(self, obj):
        """Get user name from user_id."""
        if not obj.user_id:
            return 'System'
        try:
            user = User.objects.get(pk=obj.user_id)
            return user.name
        except User.DoesNotExist:
            return 'Unknown User'


class AuditLogExportSerializer(serializers.Serializer):
    """Serializer for audit log export request."""
    format = serializers.ChoiceField(choices=['csv', 'json'])
    reason = serializers.CharField(min_length=10, max_length=500)
    date_from = serializers.DateTimeField(required=False, allow_null=True)
    date_to = serializers.DateTimeField(required=False, allow_null=True)
    table_name = serializers.CharField(required=False, allow_blank=True)
    action = serializers.ChoiceField(
        choices=['CREATE', 'UPDATE', 'DELETE'],
        required=False,
        allow_blank=True
    )
    user_id = serializers.UUIDField(required=False, allow_null=True)


class DashboardReminderSerializer(serializers.ModelSerializer):
    """Serializer for dashboard reminder display."""
    note_text = serializers.CharField(source='note.text')
    note_id = serializers.UUIDField(source='note.id')
    notable_type = serializers.CharField(source='note.notable_type')
    notable_id = serializers.UUIDField(source='note.notable_id')
    notable_name = serializers.SerializerMethodField()
    is_overdue = serializers.BooleanField(read_only=True)
    is_due_today = serializers.BooleanField(read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Reminder
        fields = [
            'id',
            'note_id',
            'note_text',
            'notable_type',
            'notable_id',
            'notable_name',
            'reminder_date',
            'reminder_time',
            'status',
            'is_overdue',
            'is_due_today',
            'author_name',
            'created_at',
        ]

    def get_notable_name(self, obj):
        """Get the name of the associated record."""
        note = obj.note
        if note.client:
            return note.client.name
        if note.case:
            return f"Case for {note.case.client.name}"
        if note.lead:
            return note.lead.name
        return 'Unknown'

    def get_author_name(self, obj):
        """Get the author's name."""
        if obj.note.author:
            return obj.note.author.name
        return 'Unknown'
