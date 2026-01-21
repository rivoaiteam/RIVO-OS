"""
Campaign service for dynamic campaign management.

Handles:
- Campaign identification from templates/tags
- Lead enrollment in campaigns
- Status calculation based on campaign tags
- Journey position tracking
"""

import logging
from django.utils import timezone
from django.db import transaction

from campaigns.models import (
    Campaign,
    CampaignTemplate,
    CampaignTag,
    CampaignJourneyStep,
    LeadCampaignEnrollment,
)

logger = logging.getLogger(__name__)


class CampaignService:
    """Service for managing campaign enrollments and status tracking."""

    @staticmethod
    def identify_campaign_from_template(template_name: str) -> Campaign | None:
        """
        Find campaign by template name.

        When a lead responds to a message from a specific template,
        we can identify which campaign they're responding to.
        """
        if not template_name:
            return None

        campaign_template = CampaignTemplate.objects.filter(
            template_name=template_name,
            campaign__is_active=True
        ).select_related('campaign').first()

        if campaign_template:
            logger.debug(
                f'Identified campaign "{campaign_template.campaign.name}" '
                f'from template "{template_name}"'
            )
            return campaign_template.campaign

        return None

    @staticmethod
    def identify_campaign_from_tag(tag_name: str) -> Campaign | None:
        """
        Find campaign by tag name.

        When a lead receives a tag, we can identify which campaign
        the tag belongs to.
        """
        if not tag_name:
            return None

        campaign_tag = CampaignTag.objects.filter(
            tag_name=tag_name,
            campaign__is_active=True
        ).select_related('campaign').first()

        if campaign_tag:
            logger.debug(
                f'Identified campaign "{campaign_tag.campaign.name}" '
                f'from tag "{tag_name}"'
            )
            return campaign_tag.campaign

        return None

    @staticmethod
    def identify_campaigns_from_tags(tag_names: list[str]) -> list[Campaign]:
        """
        Find all campaigns that any of the given tags belong to.

        Returns unique campaigns for the given tag names.
        """
        if not tag_names:
            return []

        campaign_tags = CampaignTag.objects.filter(
            tag_name__in=tag_names,
            campaign__is_active=True
        ).select_related('campaign')

        # Get unique campaigns
        campaigns = list({ct.campaign for ct in campaign_tags})
        return campaigns

    @staticmethod
    def enroll_lead_in_campaign(lead, campaign: Campaign) -> tuple[LeadCampaignEnrollment, bool]:
        """
        Enroll lead in campaign if not already enrolled.

        Returns:
            tuple: (enrollment, created)
        """
        first_step = campaign.journey_steps.first()

        enrollment, created = LeadCampaignEnrollment.objects.get_or_create(
            lead=lead,
            campaign=campaign,
            defaults={
                'current_step': first_step,
                'status': 'enrolled'
            }
        )

        if created:
            logger.info(
                f'Enrolled lead {lead.id} ({lead.phone}) in campaign '
                f'"{campaign.name}"'
            )

        return enrollment, created

    @staticmethod
    def calculate_enrollment_status(enrollment: LeadCampaignEnrollment) -> str:
        """
        Calculate enrollment status from lead's tags using campaign's tag priorities.

        Returns one of: 'enrolled', 'progressing', 'stalled', 'completed', 'dropped'
        """
        lead_tags = set(enrollment.lead.current_tags or [])

        if not lead_tags:
            return 'enrolled'

        # Get campaign tags that match the lead's tags
        matching_tags = CampaignTag.objects.filter(
            campaign=enrollment.campaign,
            tag_name__in=lead_tags
        ).order_by('-priority')

        if not matching_tags.exists():
            return 'enrolled'

        # Get highest priority tag
        highest_tag = matching_tags.first()

        if highest_tag.is_terminal:
            return 'completed' if highest_tag.is_positive else 'dropped'
        elif highest_tag.is_positive:
            return 'progressing'
        else:
            return 'stalled'

    @staticmethod
    def update_enrollment_status(enrollment: LeadCampaignEnrollment) -> str:
        """
        Update enrollment status based on current tags.

        Returns the new status.
        """
        new_status = CampaignService.calculate_enrollment_status(enrollment)

        if enrollment.status != new_status:
            old_status = enrollment.status
            enrollment.status = new_status

            if new_status in ['completed', 'dropped']:
                enrollment.completed_at = timezone.now()
                enrollment.save(update_fields=['status', 'completed_at', 'updated_at'])
            else:
                enrollment.save(update_fields=['status', 'updated_at'])

            logger.info(
                f'Updated enrollment status for lead {enrollment.lead.id} '
                f'in campaign "{enrollment.campaign.name}": '
                f'{old_status} -> {new_status}'
            )

        return new_status

    @staticmethod
    def update_journey_position(
        enrollment: LeadCampaignEnrollment,
        trigger_type: str,
        trigger_value: str
    ) -> CampaignJourneyStep | None:
        """
        Update lead's position based on trigger.

        Finds the next step that matches the trigger and updates
        the enrollment's current_step.

        Returns the new step if found, None otherwise.
        """
        current_order = enrollment.current_step.step_order if enrollment.current_step else 0

        # Find next step that matches the trigger
        next_step = CampaignJourneyStep.objects.filter(
            campaign=enrollment.campaign,
            trigger_type=trigger_type,
            trigger_value=trigger_value,
            step_order__gt=current_order
        ).first()

        if next_step:
            old_step = enrollment.current_step
            enrollment.current_step = next_step
            enrollment.save(update_fields=['current_step', 'updated_at'])

            logger.info(
                f'Lead {enrollment.lead.id} advanced to step '
                f'"{next_step.name}" in campaign "{enrollment.campaign.name}" '
                f'(triggered by {trigger_type}={trigger_value})'
            )

            return next_step

        return None

    @staticmethod
    def process_tag_change_for_campaigns(lead, changed_tag: str, action: str):
        """
        Process a tag change event for campaign enrollments.

        1. Identify campaign from the changed tag
        2. Enroll lead if not enrolled
        3. Update enrollment status
        4. Update journey position if tag_added trigger matches

        Args:
            lead: Lead instance
            changed_tag: The tag that was added/removed
            action: 'ADDED' or 'REMOVED'
        """
        with transaction.atomic():
            # Find campaign for this tag
            campaign = CampaignService.identify_campaign_from_tag(changed_tag)

            if not campaign:
                logger.debug(
                    f'No campaign found for tag "{changed_tag}", '
                    f'checking all lead tags'
                )
                # Check if lead has any campaign tags
                campaigns = CampaignService.identify_campaigns_from_tags(
                    lead.current_tags or []
                )
                if not campaigns:
                    return
                # Process each identified campaign
                for camp in campaigns:
                    CampaignService._process_enrollment(lead, camp, changed_tag, action)
                return

            CampaignService._process_enrollment(lead, campaign, changed_tag, action)

    @staticmethod
    def _process_enrollment(lead, campaign: Campaign, changed_tag: str, action: str):
        """
        Process enrollment for a specific campaign.
        """
        # Enroll lead if not already enrolled
        enrollment, created = CampaignService.enroll_lead_in_campaign(lead, campaign)

        # Update status based on current tags
        CampaignService.update_enrollment_status(enrollment)

        # If tag was added, check for journey step trigger
        if action == 'ADDED':
            CampaignService.update_journey_position(
                enrollment,
                trigger_type='tag_added',
                trigger_value=changed_tag
            )

    @staticmethod
    def process_button_click_for_campaigns(
        lead,
        button_payload: str,
        template_name: str = ''
    ):
        """
        Process a button click event for campaign enrollments.

        1. Identify campaign from template
        2. Enroll lead if not enrolled
        3. Update journey position if button_click trigger matches
        """
        with transaction.atomic():
            campaign = CampaignService.identify_campaign_from_template(template_name)

            if not campaign:
                # Try to find campaign from lead's existing enrollments
                enrollments = lead.campaign_enrollments.filter(
                    campaign__is_active=True
                ).select_related('campaign')

                if not enrollments.exists():
                    logger.debug(
                        f'No campaign found for template "{template_name}" '
                        f'and lead has no enrollments'
                    )
                    return

                # Process each enrollment
                for enrollment in enrollments:
                    CampaignService.update_journey_position(
                        enrollment,
                        trigger_type='button_click',
                        trigger_value=button_payload
                    )
                return

            # Enroll and update
            enrollment, created = CampaignService.enroll_lead_in_campaign(lead, campaign)
            CampaignService.update_journey_position(
                enrollment,
                trigger_type='button_click',
                trigger_value=button_payload
            )

    @staticmethod
    def process_text_reply_for_campaigns(lead, template_name: str = ''):
        """
        Process a text reply event for campaign enrollments.

        1. Identify campaign from template
        2. Enroll lead if not enrolled
        """
        with transaction.atomic():
            campaign = CampaignService.identify_campaign_from_template(template_name)

            if campaign:
                CampaignService.enroll_lead_in_campaign(lead, campaign)

    @staticmethod
    def get_lead_enrollments(lead) -> list[dict]:
        """
        Get all campaign enrollments for a lead with details.

        Returns list of enrollment details for display.
        """
        enrollments = lead.campaign_enrollments.select_related(
            'campaign', 'current_step'
        ).order_by('-enrolled_at')

        return [
            {
                'id': str(enrollment.id),
                'campaign_id': str(enrollment.campaign.id),
                'campaign_name': enrollment.campaign.name,
                'status': enrollment.status,
                'current_step': {
                    'name': enrollment.current_step.name,
                    'order': enrollment.current_step.step_order,
                } if enrollment.current_step else None,
                'enrolled_at': enrollment.enrolled_at.isoformat(),
                'completed_at': enrollment.completed_at.isoformat() if enrollment.completed_at else None,
            }
            for enrollment in enrollments
        ]
