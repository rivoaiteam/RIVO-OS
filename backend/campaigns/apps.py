"""
Campaigns app configuration.
"""

from django.apps import AppConfig


class CampaignsConfig(AppConfig):
    """Configuration for the campaigns app."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'campaigns'
    verbose_name = 'Campaign Management'
