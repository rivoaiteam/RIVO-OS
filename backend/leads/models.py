"""
Lead model for Rivo OS Mortgage Journey Management.

Leads are prospective clients from untrusted channels that need to be verified
for real identity and real intent before conversion to Clients.
"""

import uuid
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from audit.models import AuditableModel
from channels.models import SubSource


class LeadStatus(models.TextChoices):
    """
    Allowed status values for Lead records.

    ACTIVE: Lead is being worked on
    DECLINED: Lead was declined (no real intent)
    """
    ACTIVE = 'active', 'Active'
    DECLINED = 'declined', 'Declined'


class Lead(AuditableModel):
    """
    Lead model for tracking prospective clients from untrusted channels.

    Leads must be verified for real identity and intent before being
    converted to Clients. They can only be created from untrusted channels.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text='Unique identifier for the lead'
    )

    name = models.CharField(
        max_length=255,
        help_text='Full name of the lead'
    )

    phone = models.CharField(
        max_length=20,
        help_text='Phone number of the lead'
    )

    email = models.EmailField(
        max_length=255,
        blank=True,
        default='',
        help_text='Email address (optional)'
    )

    sub_source = models.ForeignKey(
        SubSource,
        on_delete=models.PROTECT,
        related_name='leads',
        help_text='Sub-source this lead came from (must be untrusted channel)'
    )

    intent = models.TextField(
        blank=True,
        default='',
        help_text='Notes about the lead intent (optional)'
    )

    status = models.CharField(
        max_length=20,
        choices=LeadStatus.choices,
        default=LeadStatus.ACTIVE,
        help_text='Current status of the lead'
    )

    # Store converted_client_id as UUID for now
    # Will be converted to FK when clients app is created
    converted_client_id = models.UUIDField(
        null=True,
        blank=True,
        help_text='Client record ID created when lead was converted'
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text='Timestamp when lead was created'
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        help_text='Timestamp when lead was last updated'
    )

    class Meta:
        db_table = 'leads'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status'], name='leads_status_idx'),
            models.Index(fields=['sub_source'], name='leads_sub_source_idx'),
            models.Index(fields=['created_at'], name='leads_created_at_idx'),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.phone})"

    def clean(self) -> None:
        """Validate model fields."""
        super().clean()

        # Validate status is a valid choice
        if self.status and self.status not in LeadStatus.values:
            raise ValidationError({
                'status': f'Invalid status. Must be one of: {", ".join(LeadStatus.values)}'
            })

        # Validate sub_source belongs to an untrusted channel
        if self.sub_source_id:
            try:
                sub_source = self.sub_source
                if sub_source.source.channel.is_trusted:
                    raise ValidationError({
                        'sub_source': 'Leads can only be created from untrusted channels. '
                                     f'Channel "{sub_source.source.channel.name}" is trusted.'
                    })
            except SubSource.DoesNotExist:
                raise ValidationError({
                    'sub_source': 'Sub-source does not exist.'
                })

    def save(self, *args, **kwargs) -> None:
        """Run full clean before saving."""
        self.full_clean()
        super().save(*args, **kwargs)

    @property
    def sla_minutes(self) -> int | None:
        """Get effective SLA in minutes from the channel cascade."""
        if self.sub_source:
            return self.sub_source.effective_sla_minutes
        return None

    @property
    def sla_deadline(self) -> timezone.datetime | None:
        """Calculate SLA deadline timestamp."""
        sla = self.sla_minutes
        if sla is None:
            return None
        return self.created_at + timedelta(minutes=sla)

    @property
    def sla_timer(self) -> dict:
        """
        Calculate SLA timer status.

        Returns:
            dict with keys:
                - remaining_minutes: Minutes until deadline (negative if overdue)
                - is_overdue: Boolean indicating if SLA is breached
                - display: Human-readable string (e.g., "2h 30m", "Overdue by 1h 15m")
        """
        # SLA stops when lead is in terminal state (declined or converted)
        if self.is_terminal:
            return {
                'remaining_minutes': None,
                'is_overdue': False,
                'display': 'Completed'
            }

        deadline = self.sla_deadline
        if deadline is None:
            return {
                'remaining_minutes': None,
                'is_overdue': False,
                'display': 'No SLA'
            }

        now = timezone.now()
        remaining = deadline - now
        remaining_minutes = int(remaining.total_seconds() / 60)
        is_overdue = remaining_minutes < 0

        if is_overdue:
            overdue_minutes = abs(remaining_minutes)
            hours = overdue_minutes // 60
            minutes = overdue_minutes % 60
            if hours > 0:
                display = f"Overdue by {hours}h {minutes}m"
            else:
                display = f"Overdue by {minutes}m"
        else:
            hours = remaining_minutes // 60
            minutes = remaining_minutes % 60
            if hours > 0:
                display = f"{hours}h {minutes}m"
            else:
                display = f"{minutes}m"

        return {
            'remaining_minutes': remaining_minutes,
            'is_overdue': is_overdue,
            'display': display
        }

    @property
    def is_terminal(self) -> bool:
        """Check if lead is in a terminal state (declined or converted)."""
        return self.status == LeadStatus.DECLINED or self.converted_client_id is not None
