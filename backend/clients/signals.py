"""
Signals for Client app to handle First Contact SLA tracking.

This module implements signals that auto-populate first_contact_completed_at
when qualifying events occur:
- Document upload (ClientDocument created with file)
- Note added to client
- Client status change
- Case created from client
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


@receiver(post_save, sender='documents.ClientDocument')
def mark_first_contact_on_document_upload(sender, instance, created, **kwargs):
    """
    Mark first contact as completed when a document is uploaded to a client.

    This triggers when a ClientDocument is saved with a file_url,
    indicating an actual document upload (not just a pending record).
    """
    # Only process if document has a file URL (actual upload, not pending)
    if not instance.file_url:
        return

    # Get the client
    client = instance.client
    if not client:
        return

    # Mark first contact as complete if not already set
    if not client.first_contact_completed_at:
        client.first_contact_completed_at = timezone.now()
        client.save(update_fields=['first_contact_completed_at', 'updated_at'])


@receiver(post_save, sender='audit.Note')
def mark_first_contact_on_note_added(sender, instance, created, **kwargs):
    """
    Mark first contact as completed when a note is added to a client.

    Only triggers for newly created notes attached to clients.
    """
    # Only process newly created notes
    if not created:
        return

    # Only process notes attached to clients
    if not instance.client_id:
        return

    # Get the client
    client = instance.client
    if not client:
        return

    # Mark first contact as complete if not already set
    if not client.first_contact_completed_at:
        client.first_contact_completed_at = timezone.now()
        client.save(update_fields=['first_contact_completed_at', 'updated_at'])


@receiver(post_save, sender='clients.Client')
def mark_first_contact_on_status_change(sender, instance, created, **kwargs):
    """
    Mark first contact as completed when a client's status changes.

    This triggers on any status change (e.g., to declined, not_proceeding).
    New client creation does NOT trigger this (they start as 'active').
    """
    # Skip newly created clients - status change must be an update
    if created:
        return

    # Check if status was changed by comparing with database value
    # We use update_fields if available to detect specific field updates
    update_fields = kwargs.get('update_fields')

    # If update_fields is specified, check if 'status' is in it
    # If update_fields is None (full save), we can't easily detect changes
    # without tracking original state, so we skip this optimization
    if update_fields is not None and 'status' not in update_fields:
        return

    # If first_contact already completed, skip
    if instance.first_contact_completed_at:
        return

    # For full saves without update_fields, we need to check if status actually changed
    # This is handled by comparing against the original value from the database
    # Since the instance is already saved, we check the audit log or track changes
    # For simplicity, we'll mark first contact on any status that's not 'active'
    from clients.models import ClientStatus
    if instance.status != ClientStatus.ACTIVE:
        instance.first_contact_completed_at = timezone.now()
        # Use update to avoid recursive signal
        sender.objects.filter(pk=instance.pk).update(
            first_contact_completed_at=instance.first_contact_completed_at
        )


@receiver(post_save, sender='cases.Case')
def mark_first_contact_on_case_created(sender, instance, created, **kwargs):
    """
    Mark first contact as completed when a case is created from a client.

    This is the strongest indicator of first contact - if a case is created,
    the client has definitely been contacted.
    """
    # Only process newly created cases
    if not created:
        return

    # Get the client
    client = instance.client
    if not client:
        return

    # Mark first contact as complete if not already set
    if not client.first_contact_completed_at:
        from clients.models import Client
        Client.objects.filter(pk=client.pk).update(
            first_contact_completed_at=timezone.now()
        )
