"""
Management command to sync templates from YCloud API.

Usage:
    python manage.py sync_ycloud_templates

This command:
1. Fetches all approved templates from YCloud API
2. Groups them by naming prefix to identify campaigns
3. Creates Campaign and CampaignTemplate records
4. Extracts button configurations from template structure
"""

from django.core.management.base import BaseCommand

from campaigns.discovery import CampaignDiscoveryService


class Command(BaseCommand):
    help = 'Sync WhatsApp templates from YCloud API and auto-create campaigns'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be synced without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))
            self.stdout.write('Fetching templates from YCloud...')

            from whatsapp.services import YCloudService
            ycloud = YCloudService()

            try:
                templates = ycloud.list_templates()
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Failed to fetch templates: {e}'))
                return

            if not templates:
                self.stdout.write('No templates found')
                return

            # Group by prefix
            campaigns_map = {}
            for template in templates:
                name = template.get('name', '')
                status = template.get('status', '').upper()
                if status != 'APPROVED':
                    continue

                prefix = CampaignDiscoveryService.extract_campaign_prefix(name)
                if prefix not in campaigns_map:
                    campaigns_map[prefix] = []
                campaigns_map[prefix].append(name)

            self.stdout.write(f'\nFound {len(templates)} templates in {len(campaigns_map)} campaigns:\n')

            for prefix, template_names in sorted(campaigns_map.items()):
                self.stdout.write(self.style.SUCCESS(f'  Campaign: {prefix}'))
                for name in template_names:
                    self.stdout.write(f'    - {name}')
                self.stdout.write('')

            return

        # Actual sync
        self.stdout.write('Syncing templates from YCloud...')

        result = CampaignDiscoveryService.sync_templates_from_ycloud()

        if 'error' in result:
            self.stdout.write(self.style.ERROR(f'Sync failed: {result["error"]}'))
            return

        self.stdout.write(self.style.SUCCESS(
            f'\nSync complete!\n'
            f'  Campaigns created: {result["campaigns_created"]}\n'
            f'  Templates created: {result["templates_created"]}\n'
            f'  Templates updated: {result["templates_updated"]}'
        ))
