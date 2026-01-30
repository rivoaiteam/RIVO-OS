"""
Django Admin configuration for Campaign Management.

Provides comprehensive admin interface for managing campaigns with:
- Inline editing for templates, tags, and journey steps
- Campaign enrollment monitoring
"""

from django.contrib import admin
from django.utils.html import format_html

from campaigns.models import (
    Campaign,
    CampaignTemplate,
    CampaignTag,
    CampaignJourneyStep,
    LeadCampaignEnrollment,
)


class CampaignTemplateInline(admin.TabularInline):
    """Inline admin for campaign templates."""

    model = CampaignTemplate
    extra = 1
    fields = [
        'template_name', 'display_name', 'description',
        'sequence_order', 'buttons'
    ]
    ordering = ['sequence_order']


class CampaignTagInline(admin.TabularInline):
    """Inline admin for campaign tags."""

    model = CampaignTag
    extra = 1
    fields = [
        'tag_name', 'display_name', 'description',
        'priority', 'is_positive', 'is_terminal'
    ]
    ordering = ['priority']


class CampaignJourneyStepInline(admin.TabularInline):
    """Inline admin for campaign journey steps."""

    model = CampaignJourneyStep
    extra = 1
    fields = [
        'step_order', 'name', 'description',
        'trigger_type', 'trigger_value', 'template', 'adds_tags'
    ]
    ordering = ['step_order']

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Limit template choices to templates from the same campaign."""
        if db_field.name == 'template':
            # Get campaign ID from the URL
            if hasattr(request, '_campaign_id'):
                kwargs['queryset'] = CampaignTemplate.objects.filter(
                    campaign_id=request._campaign_id
                )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    """Admin configuration for Campaign model."""

    list_display = [
        'name', 'is_active', 'is_auto_discovered', 'enrollment_count_display',
        'template_count', 'tag_count', 'last_synced_at'
    ]
    list_filter = ['is_active', 'is_auto_discovered', 'created_at']
    search_fields = ['name', 'description', 'ycloud_campaign_id']
    readonly_fields = ['id', 'is_auto_discovered', 'last_synced_at', 'created_at', 'updated_at']
    inlines = [CampaignTemplateInline, CampaignTagInline, CampaignJourneyStepInline]
    actions = ['sync_from_ycloud']

    fieldsets = [
        (None, {
            'fields': ['name', 'description', 'is_active']
        }),
        ('Auto-Discovery', {
            'fields': ['is_auto_discovered', 'last_synced_at'],
            'classes': ['collapse']
        }),
        ('YCloud Integration', {
            'fields': ['ycloud_campaign_id', 'source'],
            'classes': ['collapse']
        }),
        ('Metadata', {
            'fields': ['id', 'created_by', 'created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]

    @admin.action(description='Sync templates from YCloud API')
    def sync_from_ycloud(self, request, queryset):
        """Sync all templates from YCloud and auto-create campaigns."""
        from campaigns.discovery import CampaignDiscoveryService

        result = CampaignDiscoveryService.sync_templates_from_ycloud()

        if 'error' in result:
            self.message_user(
                request,
                f'Sync failed: {result["error"]}',
                level='error'
            )
        else:
            self.message_user(
                request,
                f'Sync complete! Created {result["campaigns_created"]} campaigns, '
                f'{result["templates_created"]} templates, '
                f'updated {result["templates_updated"]} templates.',
                level='success'
            )

    def get_changeform_initial_data(self, request):
        """Pass campaign ID to inline forms."""
        return super().get_changeform_initial_data(request)

    def changeform_view(self, request, object_id=None, form_url='', extra_context=None):
        """Store campaign ID for inline foreignkey filtering."""
        if object_id:
            request._campaign_id = object_id
        return super().changeform_view(request, object_id, form_url, extra_context)

    def enrollment_count_display(self, obj):
        """Display enrollment count with link."""
        count = obj.enrollment_count
        return format_html(
            '<a href="{}?campaign__id__exact={}">{}</a>',
            '/admin/campaigns/leadcampaignenrollment/',
            obj.id,
            count
        )
    enrollment_count_display.short_description = 'Enrollments'

    def template_count(self, obj):
        """Display template count."""
        return obj.templates.count()
    template_count.short_description = 'Templates'

    def tag_count(self, obj):
        """Display tag count."""
        return obj.tags.count()
    tag_count.short_description = 'Tags'


@admin.register(CampaignTemplate)
class CampaignTemplateAdmin(admin.ModelAdmin):
    """Admin configuration for CampaignTemplate model."""

    list_display = [
        'template_name', 'display_name', 'campaign',
        'sequence_order', 'button_count'
    ]
    list_filter = ['campaign']
    search_fields = ['template_name', 'display_name', 'description']
    ordering = ['campaign', 'sequence_order']

    def button_count(self, obj):
        """Display number of buttons."""
        return len(obj.buttons) if obj.buttons else 0
    button_count.short_description = 'Buttons'


@admin.register(CampaignTag)
class CampaignTagAdmin(admin.ModelAdmin):
    """Admin configuration for CampaignTag model."""

    list_display = [
        'tag_name', 'display_name', 'campaign',
        'priority', 'is_positive', 'is_terminal'
    ]
    list_filter = ['campaign', 'is_positive', 'is_terminal']
    search_fields = ['tag_name', 'display_name', 'description']
    ordering = ['campaign', 'priority']


@admin.register(CampaignJourneyStep)
class CampaignJourneyStepAdmin(admin.ModelAdmin):
    """Admin configuration for CampaignJourneyStep model."""

    list_display = [
        'name', 'campaign', 'step_order',
        'trigger_type', 'trigger_value', 'template'
    ]
    list_filter = ['campaign', 'trigger_type']
    search_fields = ['name', 'description', 'trigger_value']
    ordering = ['campaign', 'step_order']


@admin.register(LeadCampaignEnrollment)
class LeadCampaignEnrollmentAdmin(admin.ModelAdmin):
    """Admin configuration for LeadCampaignEnrollment model."""

    list_display = [
        'lead_display', 'campaign', 'status',
        'current_step', 'enrolled_at', 'completed_at'
    ]
    list_filter = ['campaign', 'status', 'enrolled_at']
    search_fields = ['lead__name', 'lead__phone', 'campaign__name']
    readonly_fields = ['id', 'enrolled_at', 'created_at', 'updated_at']
    ordering = ['-enrolled_at']

    raw_id_fields = ['lead']

    def lead_display(self, obj):
        """Display lead name and phone."""
        return f'{obj.lead.name} ({obj.lead.phone})'
    lead_display.short_description = 'Lead'
