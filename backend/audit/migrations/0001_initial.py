"""
Initial migration for audit app.

Creates:
- audit_logs table with indexes for efficient querying
- notes table with polymorphic associations
- reminders table linked to notes
"""

import uuid
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),
        ('clients', '0001_initial'),
        ('cases', '0001_initial'),
        ('leads', '0001_initial'),
    ]

    operations = [
        # Create audit_logs table
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4,
                    editable=False,
                    help_text='Unique identifier for the audit log entry',
                    primary_key=True,
                    serialize=False
                )),
                ('table_name', models.CharField(
                    db_index=True,
                    help_text='Name of the table that was modified',
                    max_length=100
                )),
                ('record_id', models.UUIDField(
                    db_index=True,
                    help_text='ID of the record that was modified'
                )),
                ('action', models.CharField(
                    choices=[
                        ('CREATE', 'Create'),
                        ('UPDATE', 'Update'),
                        ('DELETE', 'Delete')
                    ],
                    help_text='Type of action: CREATE, UPDATE, or DELETE',
                    max_length=10
                )),
                ('user_id', models.UUIDField(
                    blank=True,
                    db_index=True,
                    help_text='ID of the user who performed the action',
                    null=True
                )),
                ('timestamp', models.DateTimeField(
                    db_index=True,
                    default=django.utils.timezone.now,
                    help_text='When the action occurred'
                )),
                ('changes', models.JSONField(
                    default=dict,
                    help_text='JSON containing the changes (before/after values for UPDATE)'
                )),
                ('metadata', models.JSONField(
                    blank=True,
                    default=dict,
                    help_text='Additional metadata (IP, user agent, etc.)'
                )),
            ],
            options={
                'db_table': 'audit_logs',
                'ordering': ['-timestamp'],
            },
        ),
        # Add composite index for audit_logs
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(
                fields=['table_name', 'record_id'],
                name='audit_logs_table_record_idx'
            ),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(
                fields=['timestamp'],
                name='audit_logs_timestamp_idx'
            ),
        ),

        # Create notes table
        migrations.CreateModel(
            name='Note',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4,
                    editable=False,
                    help_text='Unique identifier for the note',
                    primary_key=True,
                    serialize=False
                )),
                ('text', models.TextField(
                    help_text='Note content (max 2000 characters)',
                    max_length=2000
                )),
                ('client', models.ForeignKey(
                    blank=True,
                    help_text='Client this note is attached to',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notes',
                    to='clients.client'
                )),
                ('case', models.ForeignKey(
                    blank=True,
                    help_text='Case this note is attached to',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notes',
                    to='cases.case'
                )),
                ('lead', models.ForeignKey(
                    blank=True,
                    help_text='Lead this note is attached to',
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notes',
                    to='leads.lead'
                )),
                ('author', models.ForeignKey(
                    help_text='User who created this note',
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='authored_notes',
                    to='users.user'
                )),
                ('created_at', models.DateTimeField(
                    auto_now_add=True,
                    help_text='When the note was created'
                )),
                ('updated_at', models.DateTimeField(
                    auto_now=True,
                    help_text='When the note was last updated'
                )),
            ],
            options={
                'db_table': 'notes',
                'ordering': ['-created_at'],
            },
        ),
        # Add indexes for notes
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['client'], name='notes_client_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['case'], name='notes_case_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['lead'], name='notes_lead_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['author'], name='notes_author_idx'),
        ),
        migrations.AddIndex(
            model_name='note',
            index=models.Index(fields=['created_at'], name='notes_created_at_idx'),
        ),

        # Create reminders table
        migrations.CreateModel(
            name='Reminder',
            fields=[
                ('id', models.UUIDField(
                    default=uuid.uuid4,
                    editable=False,
                    help_text='Unique identifier for the reminder',
                    primary_key=True,
                    serialize=False
                )),
                ('note', models.OneToOneField(
                    help_text='Note this reminder is attached to',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='reminder',
                    to='audit.note'
                )),
                ('reminder_date', models.DateField(
                    help_text='Due date for the reminder'
                )),
                ('reminder_time', models.TimeField(
                    blank=True,
                    help_text='Due time for the reminder (optional)',
                    null=True
                )),
                ('status', models.CharField(
                    choices=[
                        ('pending', 'Pending'),
                        ('completed', 'Completed'),
                        ('dismissed', 'Dismissed')
                    ],
                    default='pending',
                    help_text='Current status of the reminder',
                    max_length=20
                )),
                ('completed_at', models.DateTimeField(
                    blank=True,
                    help_text='When the reminder was completed',
                    null=True
                )),
                ('created_at', models.DateTimeField(
                    auto_now_add=True,
                    help_text='When the reminder was created'
                )),
                ('updated_at', models.DateTimeField(
                    auto_now=True,
                    help_text='When the reminder was last updated'
                )),
            ],
            options={
                'db_table': 'reminders',
                'ordering': ['reminder_date', 'reminder_time'],
            },
        ),
        # Add indexes for reminders
        migrations.AddIndex(
            model_name='reminder',
            index=models.Index(fields=['note'], name='reminders_note_idx'),
        ),
        migrations.AddIndex(
            model_name='reminder',
            index=models.Index(fields=['status'], name='reminders_status_idx'),
        ),
        migrations.AddIndex(
            model_name='reminder',
            index=models.Index(fields=['reminder_date'], name='reminders_date_idx'),
        ),
        migrations.AddIndex(
            model_name='reminder',
            index=models.Index(
                fields=['status', 'reminder_date'],
                name='reminders_status_date_idx'
            ),
        ),
    ]
