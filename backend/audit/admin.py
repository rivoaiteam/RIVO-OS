"""
Admin configuration for Audit models.
"""

from django.contrib import admin
from audit.models import AuditLog, Note, Reminder


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Admin view for audit logs (read-only)."""
    list_display = ['timestamp', 'action', 'table_name', 'record_id', 'user_id']
    list_filter = ['action', 'table_name', 'timestamp']
    search_fields = ['record_id', 'user_id']
    readonly_fields = ['id', 'table_name', 'record_id', 'action', 'user_id', 'timestamp', 'changes', 'metadata']
    ordering = ['-timestamp']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    """Admin view for notes."""
    list_display = ['id', 'text_preview', 'notable_type', 'author', 'created_at']
    list_filter = ['created_at']
    search_fields = ['text']
    readonly_fields = ['id', 'created_at', 'updated_at']

    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Text'


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    """Admin view for reminders."""
    list_display = ['id', 'note', 'reminder_date', 'reminder_time', 'status']
    list_filter = ['status', 'reminder_date']
    readonly_fields = ['id', 'created_at', 'updated_at', 'completed_at']
