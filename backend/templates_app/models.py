"""
Message Template models for Rivo internal templates.

These are NOT YCloud/WhatsApp templates - they are internal Rivo templates
sent as regular direct messages through the existing WhatsApp API.
"""

import uuid
from django.db import models
from users.models import User


class TemplateCategory(models.TextChoices):
    """Categories for organizing message templates."""
    GREETING = 'greeting', 'Greeting'
    FOLLOWUP = 'followup', 'Follow-up'
    DOCUMENTATION = 'documentation', 'Documentation'
    LOAN_UPDATE = 'loan_update', 'Loan Update'
    GENERAL = 'general', 'General'


class MessageTemplate(models.Model):
    """
    Internal message template for Mortgage Specialists to use in WhatsApp chats.

    Templates support variable placeholders like {first_name}, {max_loan} etc.
    that get replaced with actual client data when sending.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text='Template name for easy identification')
    category = models.CharField(
        max_length=20,
        choices=TemplateCategory.choices,
        default=TemplateCategory.GENERAL,
        help_text='Category for organizing templates'
    )
    content = models.TextField(
        help_text='Message content with {variable} placeholders'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether the template is available for use'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_templates'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Message Template'
        verbose_name_plural = 'Message Templates'

    def __str__(self):
        return f'{self.name} ({self.get_category_display()})'

    @classmethod
    def get_available_variables(cls):
        """Return list of available template variables with descriptions."""
        return [
            {'name': 'first_name', 'description': "Client's first name"},
            {'name': 'last_name', 'description': "Client's last name"},
            {'name': 'full_name', 'description': "Client's full name"},
            {'name': 'phone', 'description': "Client's phone number"},
            {'name': 'email', 'description': "Client's email address"},
            {'name': 'nationality', 'description': "Client's nationality"},
            {'name': 'company_name', 'description': "Client's employer"},
            {'name': 'monthly_salary', 'description': "Monthly salary (formatted)"},
            {'name': 'max_loan', 'description': "Maximum loan amount (formatted)"},
            {'name': 'dbr_available', 'description': "DBR available (formatted)"},
            {'name': 'today_date', 'description': "Today's date"},
        ]
