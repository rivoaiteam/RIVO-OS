"""
Fix case-level document types.

Bank Forms should only include:
- Account Opening Form
- FTS (Fee Terms Sheet)
- KFS (Key Facts Statement)
"""

from django.db import migrations
import uuid


def fix_case_document_types(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')

    # Delete old case-level document types (non-conditional)
    DocumentType.objects.filter(
        level='case',
        category__isnull=True  # Non-conditional case documents
    ).delete()

    DocumentType.objects.filter(
        level='case',
        category=''  # Non-conditional case documents
    ).delete()

    # Create correct case-level bank forms
    bank_forms = [
        {
            'name': 'Account Opening Form',
            'level': 'case',
            'required': True,
            'description': 'Bank account opening form',
            'applicant_type': 'both',
            'display_order': 1,
            'is_system': True,
        },
        {
            'name': 'FTS (Fee Terms Sheet)',
            'level': 'case',
            'required': True,
            'description': 'Fee terms sheet document',
            'applicant_type': 'both',
            'display_order': 2,
            'is_system': True,
        },
        {
            'name': 'KFS (Key Facts Statement)',
            'level': 'case',
            'required': True,
            'description': 'Key facts statement document',
            'applicant_type': 'both',
            'display_order': 3,
            'is_system': True,
        },
    ]

    for form in bank_forms:
        # Check if already exists
        if not DocumentType.objects.filter(name=form['name'], level='case').exists():
            DocumentType.objects.create(
                id=uuid.uuid4(),
                **form
            )


def reverse_fix(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')
    # Delete the new bank forms
    DocumentType.objects.filter(
        name__in=['Account Opening Form', 'FTS (Fee Terms Sheet)', 'KFS (Key Facts Statement)'],
        level='case'
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0005_add_client_to_document_type'),
    ]

    operations = [
        migrations.RunPython(fix_case_document_types, reverse_fix),
    ]
