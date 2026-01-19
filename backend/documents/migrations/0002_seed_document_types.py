"""
Seed migration for standard document types.

Creates the default client-level (KYC) and case-level (bank forms) document types.
"""

from django.db import migrations


def seed_document_types(apps, schema_editor):
    """Create standard document types."""
    DocumentType = apps.get_model('documents', 'DocumentType')

    # Client-level required documents (KYC)
    client_required_docs = [
        {
            'name': 'Passport',
            'level': 'client',
            'required': True,
            'description': 'Valid passport for identity verification',
            'applicant_type': 'both',
            'display_order': 1,
            'is_system': True,
        },
        {
            'name': 'Emirates ID',
            'level': 'client',
            'required': True,
            'description': 'UAE Emirates ID card',
            'applicant_type': 'both',
            'display_order': 2,
            'is_system': True,
        },
        {
            'name': 'Visa',
            'level': 'client',
            'required': True,
            'description': 'Valid UAE residence visa',
            'applicant_type': 'both',
            'display_order': 3,
            'is_system': True,
        },
        {
            'name': 'Salary Certificate',
            'level': 'client',
            'required': True,
            'description': 'Recent salary certificate from employer',
            'applicant_type': 'both',
            'display_order': 4,
            'is_system': True,
        },
        {
            'name': 'Pay Slips',
            'level': 'client',
            'required': True,
            'description': 'Last 3 months pay slips',
            'applicant_type': 'both',
            'display_order': 5,
            'is_system': True,
        },
        {
            'name': 'Bank Statements',
            'level': 'client',
            'required': True,
            'description': 'Last 6 months bank statements',
            'applicant_type': 'both',
            'display_order': 6,
            'is_system': True,
        },
        {
            'name': 'Liability Letters/Statements',
            'level': 'client',
            'required': True,
            'description': 'Statements for existing loans and credit cards',
            'applicant_type': 'both',
            'display_order': 7,
            'is_system': True,
        },
    ]

    # Case-level required documents (Bank Forms)
    case_required_docs = [
        {
            'name': 'Application Form',
            'level': 'case',
            'required': True,
            'description': 'Bank-specific mortgage application form',
            'applicant_type': 'both',
            'display_order': 1,
            'is_system': True,
        },
        {
            'name': 'Salary Transfer Letter (STL)',
            'level': 'case',
            'required': True,
            'description': 'Salary transfer authorization letter',
            'applicant_type': 'primary',
            'display_order': 2,
            'is_system': True,
        },
        {
            'name': 'Liability Letter',
            'level': 'case',
            'required': True,
            'description': 'Bank liability confirmation letter',
            'applicant_type': 'both',
            'display_order': 3,
            'is_system': True,
        },
    ]

    # Create all document types
    for doc_data in client_required_docs + case_required_docs:
        DocumentType.objects.get_or_create(
            name=doc_data['name'],
            level=doc_data['level'],
            defaults={
                'required': doc_data['required'],
                'description': doc_data['description'],
                'applicant_type': doc_data['applicant_type'],
                'display_order': doc_data['display_order'],
                'is_system': doc_data['is_system'],
            }
        )


def reverse_seed_document_types(apps, schema_editor):
    """Remove seeded document types."""
    DocumentType = apps.get_model('documents', 'DocumentType')
    DocumentType.objects.filter(is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_document_types, reverse_seed_document_types),
    ]