"""
Move Payment Receipt back to client conditional documents.

Payment Receipt is proof of payments to seller/developer, not bank-specific.
"""

from django.db import migrations


def move_payment_receipt_to_client(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')

    DocumentType.objects.filter(
        name='Payment Receipt',
        level='case'
    ).update(level='client', category='conditional')


def reverse_move(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')

    DocumentType.objects.filter(
        name='Payment Receipt',
        level='client',
        category='conditional'
    ).update(level='case', category='')


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0008_move_bank_docs_to_case'),
    ]

    operations = [
        migrations.RunPython(move_payment_receipt_to_client, reverse_move),
    ]
