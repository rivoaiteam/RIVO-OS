"""
Campaign auto-discovery service.

Automatically discovers campaigns from YCloud templates and webhook tags.
Uses naming conventions to group templates/tags into campaigns and infer
tag meanings.
"""

import logging
import re
from django.utils import timezone
from django.db import transaction

from campaigns.models import Campaign, CampaignTemplate, CampaignTag

logger = logging.getLogger(__name__)

# Known suffixes to strip when extracting campaign prefix
TEMPLATE_SUFFIXES = {
    'initial', 'followup', 'thanks', 'intro', 'welcome', 'reminder',
    'final', 'confirmation', 'complete', 'step1', 'step2', 'step3',
}

TAG_SUFFIXES = {
    'interested', 'not_interested', 'qualified', 'disqualified',
    'completed', 'converted', 'dropped', 'option_a', 'option_b',
    'option_c', 'option_d', 'yes', 'no', 'maybe',
}

# Patterns that indicate negative tags
NEGATIVE_TAG_PATTERNS = [
    'not_interested', 'declined', 'unsubscribed', 'disqualified',
    'no_thanks', 'opt_out', 'optout', 'unsubscribe', 'refused',
]

# Patterns that indicate terminal tags (journey complete)
TERMINAL_TAG_PATTERNS = [
    'completed', 'converted', 'done', 'finished', 'closed',
    'final', 'end', 'complete',
]


class CampaignDiscoveryService:
    """Auto-discover campaigns from YCloud templates and webhook tags."""

    @staticmethod
    def extract_campaign_prefix(name: str) -> str:
        """
        Extract campaign prefix from template/tag name.

        Examples:
            'revo_test_initial_v1' → 'revo_test'
            'revo_test_followup_v1' → 'revo_test'
            'revo_test_interested' → 'revo_test'
            'revo_test_not_interested' → 'revo_test'
            'mortgage_intro_v1' → 'mortgage'

        Args:
            name: Template or tag name

        Returns:
            Campaign prefix
        """
        if not name:
            return ''

        # Remove version suffix (v1, v2, etc.)
        name = re.sub(r'_v\d+$', '', name)

        # Split into parts
        parts = name.split('_')

        if len(parts) <= 1:
            return name

        # Work backwards to find where the suffix starts
        # Check if last 1-2 parts are known suffixes
        for i in range(len(parts) - 1, 0, -1):
            # Check single part suffix
            if parts[i].lower() in TEMPLATE_SUFFIXES | TAG_SUFFIXES:
                return '_'.join(parts[:i])

            # Check two-part suffix (e.g., 'not_interested', 'option_a')
            if i > 0:
                two_part = f'{parts[i-1]}_{parts[i]}'.lower()
                if two_part in TAG_SUFFIXES or two_part in NEGATIVE_TAG_PATTERNS:
                    return '_'.join(parts[:i-1])

        # If no suffix found, use all but last part
        return '_'.join(parts[:-1])

    @staticmethod
    def extract_buttons_from_template(template_data: dict) -> list[dict]:
        """
        Extract button configuration from YCloud template data.

        Args:
            template_data: Raw template data from YCloud API

        Returns:
            List of button objects: [{"text": "Yes", "payload": "Yes"}]
        """
        buttons = []

        components = template_data.get('components', [])
        for component in components:
            if component.get('type') == 'BUTTONS':
                for button in component.get('buttons', []):
                    if button.get('type') in ('QUICK_REPLY', 'quick_reply'):
                        buttons.append({
                            'text': button.get('text', ''),
                            'payload': button.get('text', ''),  # Quick reply payload = text
                        })

        return buttons

    @staticmethod
    def sync_templates_from_ycloud() -> dict:
        """
        Fetch templates from YCloud API and auto-create campaigns.

        Groups templates by naming prefix and creates:
        - Campaign records for each prefix
        - CampaignTemplate records for each template

        Returns:
            dict with sync results: {campaigns_created, templates_created, templates_updated}
        """
        from whatsapp.services import YCloudService

        ycloud = YCloudService()

        try:
            templates = ycloud.list_templates()
        except Exception as e:
            logger.error(f'Failed to fetch templates from YCloud: {e}')
            return {'error': str(e)}

        if not templates:
            logger.info('No templates found in YCloud')
            return {'campaigns_created': 0, 'templates_created': 0, 'templates_updated': 0}

        # Group by campaign prefix
        campaigns_map: dict[str, list[dict]] = {}
        for template in templates:
            name = template.get('name', '')
            if not name:
                continue

            # Only process approved templates
            status = template.get('status', '').upper()
            if status not in ('APPROVED', 'approved'):
                logger.debug(f'Skipping template {name} with status {status}')
                continue

            prefix = CampaignDiscoveryService.extract_campaign_prefix(name)
            if not prefix:
                prefix = name  # Use full name if no prefix extracted

            if prefix not in campaigns_map:
                campaigns_map[prefix] = []
            campaigns_map[prefix].append(template)

        # Create/update campaigns and templates
        stats = {
            'campaigns_created': 0,
            'templates_created': 0,
            'templates_updated': 0,
        }

        with transaction.atomic():
            now = timezone.now()

            for prefix, prefix_templates in campaigns_map.items():
                # Create or get campaign
                campaign, created = Campaign.objects.get_or_create(
                    name=prefix,
                    defaults={
                        'is_active': True,
                        'is_auto_discovered': True,
                        'last_synced_at': now,
                        'description': f'Auto-discovered from YCloud templates: {", ".join(t["name"] for t in prefix_templates[:3])}...'
                    }
                )

                if created:
                    stats['campaigns_created'] += 1
                    logger.info(f'Created campaign: {prefix}')
                else:
                    campaign.last_synced_at = now
                    campaign.save(update_fields=['last_synced_at', 'updated_at'])

                # Create/update templates
                for idx, template_data in enumerate(prefix_templates):
                    template_name = template_data.get('name', '')
                    buttons = CampaignDiscoveryService.extract_buttons_from_template(template_data)

                    template, t_created = CampaignTemplate.objects.update_or_create(
                        campaign=campaign,
                        template_name=template_name,
                        defaults={
                            'display_name': template_name.replace('_', ' ').title(),
                            'sequence_order': idx,
                            'buttons': buttons,
                            'is_auto_discovered': True,
                            'ycloud_template_data': template_data,
                        }
                    )

                    if t_created:
                        stats['templates_created'] += 1
                        logger.info(f'Created template: {template_name} for campaign {prefix}')
                    else:
                        stats['templates_updated'] += 1

        logger.info(
            f'YCloud template sync complete: '
            f'{stats["campaigns_created"]} campaigns created, '
            f'{stats["templates_created"]} templates created, '
            f'{stats["templates_updated"]} templates updated'
        )

        return stats

    @staticmethod
    def infer_tag_properties(tag_name: str) -> dict:
        """
        Infer tag properties from its name.

        Args:
            tag_name: The tag name to analyze

        Returns:
            dict with: is_positive, is_terminal, priority
        """
        tag_lower = tag_name.lower()

        # Check if negative
        is_positive = not any(
            pattern in tag_lower for pattern in NEGATIVE_TAG_PATTERNS
        )

        # Check if terminal
        is_terminal = any(
            pattern in tag_lower for pattern in TERMINAL_TAG_PATTERNS
        )

        # Assign priority based on tag type
        if is_terminal:
            priority = 5  # Highest - journey complete
        elif 'qualified' in tag_lower:
            priority = 4  # High - qualified/disqualified
        elif 'interested' in tag_lower:
            priority = 4  # High - interest shown
        elif 'option' in tag_lower or 'choice' in tag_lower:
            priority = 3  # Medium - made a choice
        elif 'segment' in tag_lower or 'locale' in tag_lower:
            priority = 2  # Lower - categorization
        else:
            priority = 2  # Default

        return {
            'is_positive': is_positive,
            'is_terminal': is_terminal,
            'priority': priority,
        }

    @staticmethod
    def auto_discover_tag(tag_name: str) -> CampaignTag | None:
        """
        Auto-create CampaignTag when a new tag is encountered.

        Infers:
        - Campaign from naming prefix
        - is_positive from name patterns (negative keywords)
        - is_terminal from name patterns (completion keywords)
        - priority from tag type

        Args:
            tag_name: The tag name from YCloud webhook

        Returns:
            CampaignTag instance (created or existing)
        """
        if not tag_name:
            return None

        # Check if tag already exists
        existing_tag = CampaignTag.objects.filter(tag_name=tag_name).first()
        if existing_tag:
            return existing_tag

        # Extract campaign prefix
        prefix = CampaignDiscoveryService.extract_campaign_prefix(tag_name)
        if not prefix:
            prefix = tag_name.rsplit('_', 1)[0] if '_' in tag_name else tag_name

        with transaction.atomic():
            # Find or create campaign
            campaign = Campaign.objects.filter(name=prefix).first()
            if not campaign:
                campaign = Campaign.objects.create(
                    name=prefix,
                    is_active=True,
                    is_auto_discovered=True,
                    description=f'Auto-discovered from tag: {tag_name}'
                )
                logger.info(f'Created campaign from tag: {prefix}')

            # Infer tag properties
            properties = CampaignDiscoveryService.infer_tag_properties(tag_name)

            # Create tag
            tag = CampaignTag.objects.create(
                campaign=campaign,
                tag_name=tag_name,
                display_name=tag_name.replace('_', ' ').title(),
                priority=properties['priority'],
                is_positive=properties['is_positive'],
                is_terminal=properties['is_terminal'],
                is_auto_discovered=True,
            )

            logger.info(
                f'Auto-discovered tag: {tag_name} '
                f'(campaign={prefix}, positive={properties["is_positive"]}, '
                f'terminal={properties["is_terminal"]}, priority={properties["priority"]})'
            )

            return tag

    @staticmethod
    def ensure_tag_exists(tag_name: str) -> CampaignTag | None:
        """
        Ensure a tag exists in the database, creating it if needed.

        This is the main entry point for webhook handlers.

        Args:
            tag_name: The tag name from YCloud webhook

        Returns:
            CampaignTag instance or None if tag_name is empty
        """
        if not tag_name:
            return None

        # Try to find existing
        tag = CampaignTag.objects.filter(tag_name=tag_name).first()
        if tag:
            return tag

        # Auto-discover
        return CampaignDiscoveryService.auto_discover_tag(tag_name)
