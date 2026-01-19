"""
Audit Log models for Rivo OS.

This module implements the audit logging system that tracks all database changes,
provides human-readable activity timelines per record, and supports notes with reminders.
"""

import uuid
import json
from decimal import Decimal
from datetime import timedelta
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class AuditAction(models.TextChoices):
    """Action types for audit log entries."""
    CREATE = 'CREATE', 'Create'
    UPDATE = 'UPDATE', 'Update'
    DELETE = 'DELETE', 'Delete'


class AuditLog(models.Model):
    """
    Immutable audit log for tracking all database changes.

    Every CREATE, UPDATE, DELETE operation on tracked models creates an entry.
    This table is append-only - no updates or deletes allowed.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the audit log entry'
    )

    table_name = models.CharField(
        max_length=100,
        db_index=True,
        help_text='Name of the table that was modified'
    )

    record_id = models.UUIDField(
        db_index=True,
        help_text='ID of the record that was modified'
    )

    action = models.CharField(
        max_length=10,
        choices=AuditAction.choices,
        help_text='Type of action: CREATE, UPDATE, or DELETE'
    )

    user_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        help_text='ID of the user who performed the action'
    )

    timestamp = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        help_text='When the action occurred'
    )

    changes = models.JSONField(
        default=dict,
        help_text='JSON containing the changes (before/after values for UPDATE)'
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional metadata (IP, user agent, etc.)'
    )

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(
                fields=['table_name', 'record_id'],
                name='audit_logs_table_record_idx'
            ),
            models.Index(
                fields=['timestamp'],
                name='audit_logs_timestamp_idx'
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action} on {self.table_name} ({self.record_id}) at {self.timestamp}"

    def save(self, *args, **kwargs) -> None:
        """
        Override save to enforce append-only behavior.
        Only allows creation of new records, not updates.
        """
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValidationError('Audit log entries cannot be updated.')
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs) -> None:
        """
        Override delete to prevent deletion of audit entries.
        Audit logs are immutable - they cannot be deleted.
        """
        raise ValidationError('Audit log entries cannot be deleted.')


# Thread-local storage for current user context
import threading
_audit_context = threading.local()


def set_audit_user(user_id):
    """Set the current user ID for audit logging."""
    _audit_context.user_id = user_id


def get_audit_user():
    """Get the current user ID for audit logging."""
    return getattr(_audit_context, 'user_id', None)


def clear_audit_user():
    """Clear the current user context."""
    _audit_context.user_id = None


class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Decimal types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return str(obj)
        return super().default(obj)


class AuditableModel(models.Model):
    """
    Abstract base model that automatically creates audit log entries.

    Models inheriting from this will automatically log:
    - CREATE: When a new record is created
    - UPDATE: When a record is modified (with before/after values)
    - DELETE: When a record is deleted

    Usage:
        class Client(AuditableModel):
            name = models.CharField(max_length=255)
            ...
    """

    class Meta:
        abstract = True

    def _get_field_value(self, field_name):
        """Get a serializable value for a field."""
        value = getattr(self, field_name, None)
        if value is None:
            return None
        if isinstance(value, Decimal):
            return str(value)
        if hasattr(value, 'isoformat'):  # datetime/date
            return value.isoformat()
        if hasattr(value, 'pk'):  # Related object
            return str(value.pk)
        return value

    def _get_tracked_fields(self):
        """Get list of field names to track (excludes auto-fields and relations)."""
        tracked = []
        for field in self._meta.get_fields():
            # Skip reverse relations
            if field.is_relation and field.auto_created:
                continue
            # Skip many-to-many
            if field.many_to_many:
                continue
            # Skip auto-generated fields we don't want to track
            if hasattr(field, 'name') and field.name not in ['id']:
                tracked.append(field.name)
        return tracked

    def _get_changes(self, old_values: dict) -> dict:
        """Compare old values with current values and return changes."""
        changes = {}
        for field_name in self._get_tracked_fields():
            old_value = old_values.get(field_name)
            new_value = self._get_field_value(field_name)

            # Only record if changed
            if old_value != new_value:
                changes[field_name] = {
                    'old': old_value,
                    'new': new_value
                }
        return changes

    def _get_current_values(self) -> dict:
        """Get current values of all tracked fields."""
        values = {}
        for field_name in self._get_tracked_fields():
            values[field_name] = self._get_field_value(field_name)
        return values

    def _create_audit_entry(self, action: str, changes: dict = None):
        """Create an audit log entry for this model."""
        from audit.models import AuditLog, get_audit_user

        if changes is None:
            changes = {}

        AuditLog.objects.create(
            table_name=self._meta.db_table,
            record_id=self.pk,
            action=action,
            user_id=get_audit_user(),
            changes=changes
        )

    def save(self, *args, skip_audit=False, **kwargs) -> None:
        """
        Override save to create audit log entries.

        Args:
            skip_audit: If True, skip creating audit entry (for internal use)
        """
        is_new = self._state.adding
        old_values = {}

        # For updates, get the old values from the database
        if not is_new and not skip_audit:
            try:
                old_instance = self.__class__.objects.get(pk=self.pk)
                old_values = old_instance._get_current_values()
            except self.__class__.DoesNotExist:
                # Treat as new if not found
                is_new = True

        # Call parent save
        super().save(*args, **kwargs)

        # Create audit entry if not skipped
        if not skip_audit:
            if is_new:
                # For CREATE, record all field values
                changes = self._get_current_values()
                self._create_audit_entry(AuditAction.CREATE, changes)
            else:
                # For UPDATE, record only changed fields
                changes = self._get_changes(old_values)
                if changes:  # Only log if something changed
                    self._create_audit_entry(AuditAction.UPDATE, changes)

    def delete(self, *args, skip_audit=False, **kwargs):
        """
        Override delete to create audit log entry before deletion.

        Args:
            skip_audit: If True, skip creating audit entry (for internal use)
        """
        if not skip_audit:
            # Record the deleted record's values
            changes = self._get_current_values()
            self._create_audit_entry(AuditAction.DELETE, changes)

        return super().delete(*args, **kwargs)


class ReminderStatus(models.TextChoices):
    """Status choices for reminders."""
    PENDING = 'pending', 'Pending'
    COMPLETED = 'completed', 'Completed'
    DISMISSED = 'dismissed', 'Dismissed'


class Note(AuditableModel):
    """
    User-created notes that can be attached to Clients, Cases, or Leads.

    Notes support optional reminders and have a 24-hour edit window.
    After 24 hours, notes can only be deleted by the author or an Admin.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the note'
    )

    text = models.TextField(
        max_length=2000,
        help_text='Note content (max 2000 characters)'
    )

    # Polymorphic association - only one should be set
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_notes',
        help_text='Client this note is attached to'
    )

    case = models.ForeignKey(
        'cases.Case',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_notes',
        help_text='Case this note is attached to'
    )

    lead = models.ForeignKey(
        'leads.Lead',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='activity_notes',
        help_text='Lead this note is attached to'
    )

    author = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='authored_notes',
        help_text='User who created this note'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the note was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the note was last updated'
    )

    class Meta:
        db_table = 'notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['client'], name='notes_client_idx'),
            models.Index(fields=['case'], name='notes_case_idx'),
            models.Index(fields=['lead'], name='notes_lead_idx'),
            models.Index(fields=['author'], name='notes_author_idx'),
            models.Index(fields=['created_at'], name='notes_created_at_idx'),
        ]

    def __str__(self) -> str:
        preview = self.text[:50] + '...' if len(self.text) > 50 else self.text
        return f"Note: {preview}"

    def clean(self) -> None:
        """Validate note fields."""
        super().clean()

        # Validate text length
        if self.text and len(self.text) > 2000:
            raise ValidationError({
                'text': 'Note text cannot exceed 2000 characters.'
            })

        # Validate that exactly one of client/case/lead is set
        associations = [self.client_id, self.case_id, self.lead_id]
        set_associations = [a for a in associations if a is not None]

        if len(set_associations) == 0:
            raise ValidationError(
                'Note must be attached to a Client, Case, or Lead.'
            )
        if len(set_associations) > 1:
            raise ValidationError(
                'Note can only be attached to one of Client, Case, or Lead.'
            )

    def save(self, *args, **kwargs) -> None:
        """Validate before saving."""
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def is_editable(self) -> bool:
        """Check if the note is still within the 24-hour edit window."""
        if not self.created_at:
            return True
        edit_deadline = self.created_at + timedelta(hours=24)
        return timezone.now() < edit_deadline

    @property
    def notable_type(self) -> str:
        """Return the type of record this note is attached to."""
        if self.client_id:
            return 'client'
        if self.case_id:
            return 'case'
        if self.lead_id:
            return 'lead'
        return 'unknown'

    @property
    def notable_id(self) -> uuid.UUID | None:
        """Return the ID of the record this note is attached to."""
        return self.client_id or self.case_id or self.lead_id

    def can_edit(self, user) -> bool:
        """Check if the given user can edit this note."""
        if not user:
            return False
        # Admin can always edit
        if hasattr(user, 'is_admin') and user.is_admin:
            return True
        # Author can edit within 24 hours
        if self.author_id == user.id:
            return self.is_editable
        return False

    def can_delete(self, user) -> bool:
        """Check if the given user can delete this note."""
        if not user:
            return False
        # Admin can always delete
        if hasattr(user, 'is_admin') and user.is_admin:
            return True
        # Author can always delete their own notes
        return self.author_id == user.id


class Reminder(AuditableModel):
    """
    Reminder associated with a note.

    Reminders appear on the Dashboard "What's Next" section when due.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the reminder'
    )

    note = models.OneToOneField(
        Note,
        on_delete=models.CASCADE,
        related_name='reminder',
        help_text='Note this reminder is attached to'
    )

    reminder_date = models.DateField(
        help_text='Due date for the reminder'
    )

    reminder_time = models.TimeField(
        null=True,
        blank=True,
        help_text='Due time for the reminder (optional)'
    )

    status = models.CharField(
        max_length=20,
        choices=ReminderStatus.choices,
        default=ReminderStatus.PENDING,
        help_text='Current status of the reminder'
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When the reminder was completed'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='When the reminder was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='When the reminder was last updated'
    )

    class Meta:
        db_table = 'reminders'
        ordering = ['reminder_date', 'reminder_time']
        indexes = [
            models.Index(fields=['note'], name='reminders_note_idx'),
            models.Index(fields=['status'], name='reminders_status_idx'),
            models.Index(fields=['reminder_date'], name='reminders_date_idx'),
            models.Index(
                fields=['status', 'reminder_date'],
                name='reminders_status_date_idx'
            ),
        ]

    def __str__(self) -> str:
        return f"Reminder for {self.reminder_date}"

    @property
    def is_overdue(self) -> bool:
        """Check if the reminder is overdue."""
        if self.status != ReminderStatus.PENDING:
            return False

        now = timezone.now()
        today = now.date()

        if self.reminder_date < today:
            return True

        if self.reminder_date == today and self.reminder_time:
            current_time = now.time()
            return current_time > self.reminder_time

        return False

    @property
    def is_due_today(self) -> bool:
        """Check if the reminder is due today."""
        return self.reminder_date == timezone.now().date()

    def mark_complete(self) -> None:
        """Mark the reminder as completed."""
        self.status = ReminderStatus.COMPLETED
        self.completed_at = timezone.now()
        self.save()

    def dismiss(self) -> None:
        """Dismiss the reminder."""
        self.status = ReminderStatus.DISMISSED
        self.save()
