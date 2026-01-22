"""
Move conditional documents from case-level to client-level.

All conditional documents should appear in Client Documents tab,
not in Case Bank Forms.
"""

from django.db import migrations


def move_conditional_to_client(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')

    # Update case-level conditional documents to client-level
    DocumentType.objects.filter(
        level='case',
        category='conditional'
    ).update(level='client')


def reverse_move(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')

    # These specific documents were originally case-level
    case_conditional_docs = [
        'Title Deed',
        'MOU',
        'Valuation Report',
        'PDC Cheques',
        'MC Cheque',
        'Payment Receipt',
    ]

    DocumentType.objects.filter(
        name__in=case_conditional_docs,
        level='client',
        category='conditional'
    ).update(level='case')


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0006_fix_case_document_types'),
    ]

    operations = [
        migrations.RunPython(move_conditional_to_client, reverse_move),
    ]
