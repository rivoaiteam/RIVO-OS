"""
Move bank-related conditional documents to case level (Bank Forms).

Documents moved:
- Valuation Report (Bank orders)
- PDC Cheques (Post-dated cheques for bank)
- MC Cheque (Manager's Cheque - down payment)
- Payment Receipt (Proof of payments)
"""

from django.db import migrations


def move_bank_docs_to_case(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')

    bank_related_docs = [
        'Valuation Report',
        'PDC Cheques',
        'MC Cheque',
        'Payment Receipt',
    ]

    # Update these documents to case level and remove conditional category
    DocumentType.objects.filter(
        name__in=bank_related_docs,
        level='client',
        category='conditional'
    ).update(level='case', category='')


def reverse_move(apps, schema_editor):
    DocumentType = apps.get_model('documents', 'DocumentType')

    bank_related_docs = [
        'Valuation Report',
        'PDC Cheques',
        'MC Cheque',
        'Payment Receipt',
    ]

    # Move back to client level as conditional
    DocumentType.objects.filter(
        name__in=bank_related_docs,
        level='case'
    ).update(level='client', category='conditional')


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0007_move_conditional_to_client'),
    ]

    operations = [
        migrations.RunPython(move_bank_docs_to_case, reverse_move),
    ]
