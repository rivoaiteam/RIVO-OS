"""
Channel models for Rivo OS Lead Management.

Channels are entry points for leads with three levels of attribution:
Channel → Source → Sub-source
"""

import uuid
from django.db import models
from users.models import User


class Channel(models.Model):
    """
    Top-level channel representing a lead source category.

    Examples: Performance Marketing, Partner Hub, Freelance Network,
    BH Mortgage Team, AskRivo
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text='Channel name (e.g., Performance Marketing)'
    )

    description = models.TextField(
        blank=True,
        default='',
        help_text='Description of this channel'
    )

    is_trusted = models.BooleanField(
        default=False,
        help_text='Trusted channels create Clients directly; untrusted create Leads'
    )

    default_sla_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='Default SLA in minutes for this channel'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether this channel is active'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'channels'
        ordering = ['name']

    def __str__(self):
        return self.name


class Source(models.Model):
    """
    Mid-level source within a channel.

    Examples: Google Search, Meta (under Performance Marketing),
    AEON, Partner Hub (under Partner Hub)
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    channel = models.ForeignKey(
        Channel,
        on_delete=models.CASCADE,
        related_name='sources',
        help_text='Parent channel'
    )

    name = models.CharField(
        max_length=100,
        help_text='Source name (e.g., Google Search)'
    )

    sla_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='SLA override in minutes (null = use channel default)'
    )

    is_active = models.BooleanField(
        default=True,
        help_text='Whether this source is active'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sources'
        ordering = ['name']
        unique_together = ['channel', 'name']

    def __str__(self):
        return f"{self.channel.name} > {self.name}"

    @property
    def effective_sla_minutes(self):
        """Get effective SLA (source override or channel default)."""
        if self.sla_minutes is not None:
            return self.sla_minutes
        return self.channel.default_sla_minutes


class SubSource(models.Model):
    """
    Granular sub-source within a source.

    Examples: Specific campaigns, partner agencies, freelance agents,
    or MS users (for BH Mortgage Team).
    """

    class Status(models.TextChoices):
        # For trusted channels
        ACTIVE = 'active', 'Active'
        INACTIVE = 'inactive', 'Inactive'
        # For untrusted channels
        INCUBATION = 'incubation', 'Incubation'
        LIVE = 'live', 'Live'
        PAUSED = 'paused', 'Paused'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    source = models.ForeignKey(
        Source,
        on_delete=models.CASCADE,
        related_name='sub_sources',
        help_text='Parent source'
    )

    name = models.CharField(
        max_length=100,
        help_text='Sub-source name (e.g., campaign name, agent name)'
    )

    sla_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='SLA override in minutes (null = use channel default)'
    )

    linked_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='linked_sub_sources',
        help_text='Linked MS user (for BH Mortgage Team self-sourcing)'
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.INCUBATION,
        help_text='Status: active/inactive for trusted, incubation/live/paused for untrusted'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sub_sources'
        ordering = ['name']
        unique_together = ['source', 'name']

    def __str__(self):
        return f"{self.source} > {self.name}"

    @property
    def effective_sla_minutes(self):
        """Get effective SLA with cascade: Sub-source > Source > Channel."""
        if self.sla_minutes is not None:
            return self.sla_minutes
        if self.source.sla_minutes is not None:
            return self.source.sla_minutes
        return self.source.channel.default_sla_minutes
