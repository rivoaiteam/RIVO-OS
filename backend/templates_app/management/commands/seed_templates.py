"""
Management command to seed default message templates.
Run with: python manage.py seed_templates
"""

from django.core.management.base import BaseCommand
from templates_app.models import MessageTemplate, TemplateCategory


TEMPLATES = [
    # Welcome Template
    {
        'name': 'Welcome Message',
        'category': TemplateCategory.GREETING,
        'content': '''Hi {first_name},

Thank you for your interest in getting a mortgage. I'm your dedicated Mortgage Specialist from Rivo.

I'll be helping you through the entire mortgage process. To get started, could you share:
- Your monthly salary
- Employment type (salaried/self-employed)
- Nationality

Looking forward to helping you!''',
    },

    # Document Request Template
    {
        'name': 'Document Request',
        'category': TemplateCategory.DOCUMENTATION,
        'content': '''Hi {first_name},

To proceed with your mortgage application, please share the following documents:

1. Emirates ID (front & back)
2. Passport copy with visa page
3. Salary certificate (dated within 30 days)
4. Last 6 months bank statements
5. Last 3 months payslips

Please send clear photos or PDFs. Let me know if you have any questions!''',
    },

    # Follow-up Template
    {
        'name': 'Follow-up',
        'category': TemplateCategory.FOLLOWUP,
        'content': '''Hi {first_name},

Just following up on the documents we discussed. We're still waiting for a few items to proceed with your application.

Could you please share the pending documents at your earliest? This will help us move forward quickly.

Let me know if you need any help!''',
    },

    # Application Update Template
    {
        'name': 'Application Update',
        'category': TemplateCategory.APPLICATION_UPDATE,
        'content': '''Hi {first_name},

Great news! Your mortgage application has been submitted to the bank.

The bank typically takes 3-5 working days for initial review. I'll keep you updated on the progress.

Let me know if you have any questions!''',
    },
]


class Command(BaseCommand):
    help = 'Seed default message templates'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing templates before seeding',
        )

    def handle(self, *args, **options):
        if options['clear']:
            deleted_count = MessageTemplate.objects.all().delete()[0]
            self.stdout.write(f'Deleted {deleted_count} existing templates')

        created_count = 0
        updated_count = 0

        for template_data in TEMPLATES:
            template, created = MessageTemplate.objects.update_or_create(
                name=template_data['name'],
                defaults={
                    'category': template_data['category'],
                    'content': template_data['content'],
                    'is_active': True,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(f'  Created: {template.name}')
            else:
                updated_count += 1
                self.stdout.write(f'  Updated: {template.name}')

        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Created {created_count}, Updated {updated_count} templates.'
        ))
