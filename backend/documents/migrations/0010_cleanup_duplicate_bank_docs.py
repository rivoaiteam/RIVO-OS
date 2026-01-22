"""
Cleanup duplicate bank-related documents.

Remove the 'standard' (no category) versions of bank documents from client level.
These are duplicates - the real bank docs should only be at case level.
Keep Payment Receipt as conditional at client level.
"""

from django.db import migrations


def cleanup_duplicates(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')

    # Remove standard (no category) bank docs from client level
    # These should only exist at case level
    bank_docs_to_remove = ['Valuation Report', 'PDC Cheques', 'MC Cheque']

    DocumentType.objects.filter(
        name__in=bank_docs_to_remove,
        level='client',
        category='',  # standard (no category)
        client__isnull=True  # global templates only
    ).delete()

    # Also remove standard Payment Receipt (keep conditional version)
    DocumentType.objects.filter(
        name='Payment Receipt',
        level='client',
        category='',  # standard (no category)
        client__isnull=True
    ).delete()


def reverse_cleanup(apps, schema_editor):
    # Can't easily reverse a delete, but we can recreate
    DocumentType = apps.get_model('documents', 'DocumentType')

    bank_docs = ['Valuation Report', 'PDC Cheques', 'MC Cheque', 'Payment Receipt']

    for name in bank_docs:
        DocumentType.objects.get_or_create(
            name=name,
            level='client',
            category='',
            defaults={'required': False}
        )


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0009_move_payment_receipt_to_client'),
    ]

    operations = [
        migrations.RunPython(cleanup_duplicates, reverse_cleanup),
    ]
