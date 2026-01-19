"""
Data migration to seed document types for all categories.

Categories:
1. Salaried - UAE National (6 docs)
2. Self-Employed - UAE National (10 docs)
3. Salaried - UAE Resident (6 docs)
4. Self-Employed - UAE Resident (10 docs)
5. Salaried - Non-Resident (7 docs)
6. Self-Employed - Non-Resident (8 docs)
7. Conditional (14 docs)
"""

from django.db import migrations
import uuid


def seed_document_types(apps, schema_editor):
    """Create all document types for mortgage applications."""
    DocumentType = apps.get_model('documents', 'DocumentType')

    # Clear existing system document types
    DocumentType.objects.filter(is_system=True).delete()

    document_types = [
        # ============================================
        # 1. Salaried - UAE National (6)
        # ============================================
        {'name': 'Passport', 'level': 'client', 'category': 'salaried_uae_national', 'required': True, 'display_order': 1, 'is_system': True},
        {'name': 'Emirates ID', 'level': 'client', 'category': 'salaried_uae_national', 'required': True, 'display_order': 2, 'is_system': True},
        {'name': 'Family Book', 'level': 'client', 'category': 'salaried_uae_national', 'required': True, 'display_order': 3, 'is_system': True},
        {'name': 'Salary Certificate', 'level': 'client', 'category': 'salaried_uae_national', 'required': True, 'display_order': 4, 'is_system': True},
        {'name': 'Payslips (6 months)', 'level': 'client', 'category': 'salaried_uae_national', 'required': True, 'display_order': 5, 'is_system': True},
        {'name': 'Personal Bank Statements (6 months)', 'level': 'client', 'category': 'salaried_uae_national', 'required': True, 'display_order': 6, 'is_system': True},

        # ============================================
        # 2. Self-Employed - UAE National (10)
        # ============================================
        {'name': 'Passport', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 1, 'is_system': True},
        {'name': 'Emirates ID', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 2, 'is_system': True},
        {'name': 'Family Book', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 3, 'is_system': True},
        {'name': 'Trade License', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 4, 'is_system': True},
        {'name': 'MOA with Amendments', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 5, 'is_system': True},
        {'name': 'Company Bank Statements (12 months)', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 6, 'is_system': True},
        {'name': 'Personal Bank Statements (6 months)', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 7, 'is_system': True},
        {'name': 'VAT Certificate', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 8, 'is_system': True},
        {'name': 'Audit Report', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 9, 'is_system': True},
        {'name': 'VAT Returns (4 quarters)', 'level': 'client', 'category': 'self_employed_uae_national', 'required': True, 'display_order': 10, 'is_system': True},

        # ============================================
        # 3. Salaried - UAE Resident (6)
        # ============================================
        {'name': 'Passport', 'level': 'client', 'category': 'salaried_uae_resident', 'required': True, 'display_order': 1, 'is_system': True},
        {'name': 'Emirates ID', 'level': 'client', 'category': 'salaried_uae_resident', 'required': True, 'display_order': 2, 'is_system': True},
        {'name': 'Visa', 'level': 'client', 'category': 'salaried_uae_resident', 'required': True, 'display_order': 3, 'is_system': True},
        {'name': 'Salary Certificate', 'level': 'client', 'category': 'salaried_uae_resident', 'required': True, 'display_order': 4, 'is_system': True},
        {'name': 'Payslips (6 months)', 'level': 'client', 'category': 'salaried_uae_resident', 'required': True, 'display_order': 5, 'is_system': True},
        {'name': 'Personal Bank Statements (6 months)', 'level': 'client', 'category': 'salaried_uae_resident', 'required': True, 'display_order': 6, 'is_system': True},

        # ============================================
        # 4. Self-Employed - UAE Resident (10)
        # ============================================
        {'name': 'Passport', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 1, 'is_system': True},
        {'name': 'Emirates ID', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 2, 'is_system': True},
        {'name': 'Visa', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 3, 'is_system': True},
        {'name': 'Trade License', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 4, 'is_system': True},
        {'name': 'MOA with Amendments', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 5, 'is_system': True},
        {'name': 'Company Bank Statements (12 months)', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 6, 'is_system': True},
        {'name': 'Personal Bank Statements (6 months)', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 7, 'is_system': True},
        {'name': 'VAT Certificate', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 8, 'is_system': True},
        {'name': 'Audit Report', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 9, 'is_system': True},
        {'name': 'VAT Returns (4 quarters)', 'level': 'client', 'category': 'self_employed_uae_resident', 'required': True, 'display_order': 10, 'is_system': True},

        # ============================================
        # 5. Salaried - Non-Resident (7)
        # ============================================
        {'name': 'Passport', 'level': 'client', 'category': 'salaried_non_resident', 'required': True, 'display_order': 1, 'is_system': True},
        {'name': 'National ID Card', 'level': 'client', 'category': 'salaried_non_resident', 'required': True, 'display_order': 2, 'is_system': True},
        {'name': 'Salary Certificate', 'level': 'client', 'category': 'salaried_non_resident', 'required': True, 'display_order': 3, 'is_system': True},
        {'name': 'Payslips (6 months)', 'level': 'client', 'category': 'salaried_non_resident', 'required': True, 'display_order': 4, 'is_system': True},
        {'name': 'Personal Bank Statements (6 months)', 'level': 'client', 'category': 'salaried_non_resident', 'required': True, 'display_order': 5, 'is_system': True},
        {'name': 'Credit Report', 'level': 'client', 'category': 'salaried_non_resident', 'required': True, 'display_order': 6, 'is_system': True},
        {'name': 'Utility Bill', 'level': 'client', 'category': 'salaried_non_resident', 'required': True, 'display_order': 7, 'is_system': True},

        # ============================================
        # 6. Self-Employed - Non-Resident (8)
        # ============================================
        {'name': 'Passport', 'level': 'client', 'category': 'self_employed_non_resident', 'required': True, 'display_order': 1, 'is_system': True},
        {'name': 'National ID Card', 'level': 'client', 'category': 'self_employed_non_resident', 'required': True, 'display_order': 2, 'is_system': True},
        {'name': 'Company Ownership Documents', 'level': 'client', 'category': 'self_employed_non_resident', 'required': True, 'display_order': 3, 'is_system': True},
        {'name': 'Company Bank Statements (12 months)', 'level': 'client', 'category': 'self_employed_non_resident', 'required': True, 'display_order': 4, 'is_system': True},
        {'name': 'Personal Bank Statements (6 months)', 'level': 'client', 'category': 'self_employed_non_resident', 'required': True, 'display_order': 5, 'is_system': True},
        {'name': 'Credit Report', 'level': 'client', 'category': 'self_employed_non_resident', 'required': True, 'display_order': 6, 'is_system': True},
        {'name': 'Utility Bill', 'level': 'client', 'category': 'self_employed_non_resident', 'required': True, 'display_order': 7, 'is_system': True},
        {'name': 'Office Utility Bill', 'level': 'client', 'category': 'self_employed_non_resident', 'required': True, 'display_order': 8, 'is_system': True},

        # ============================================
        # 7. Conditional Documents (14)
        # ============================================
        {'name': 'Credit Card Statements', 'level': 'client', 'category': 'conditional', 'condition': 'If has credit cards', 'required': False, 'display_order': 1, 'is_system': True},
        {'name': 'Loan Statements', 'level': 'client', 'category': 'conditional', 'condition': 'If has existing loans', 'required': False, 'display_order': 2, 'is_system': True},
        {'name': 'Educational Allowance Proof', 'level': 'client', 'category': 'conditional', 'condition': 'If claiming allowance', 'required': False, 'display_order': 3, 'is_system': True},
        {'name': 'Rental Income Proof', 'level': 'client', 'category': 'conditional', 'condition': 'If claiming rental income', 'required': False, 'display_order': 4, 'is_system': True},
        {'name': 'Ejari', 'level': 'client', 'category': 'conditional', 'condition': 'If claiming rental income (UAE)', 'required': False, 'display_order': 5, 'is_system': True},
        {'name': 'Labor Card', 'level': 'client', 'category': 'conditional', 'condition': 'If bank requests', 'required': False, 'display_order': 6, 'is_system': True},
        {'name': 'Labor Contract', 'level': 'client', 'category': 'conditional', 'condition': 'If bank requests', 'required': False, 'display_order': 7, 'is_system': True},
        {'name': 'Tenancy Contract', 'level': 'client', 'category': 'conditional', 'condition': 'Current residence proof', 'required': False, 'display_order': 8, 'is_system': True},
        {'name': 'Title Deed', 'level': 'case', 'category': 'conditional', 'condition': 'Resale / Buyout / Equity', 'required': False, 'display_order': 9, 'is_system': True},
        {'name': 'MOU', 'level': 'case', 'category': 'conditional', 'condition': 'Purchase / Resale', 'required': False, 'display_order': 10, 'is_system': True},
        {'name': 'Valuation Report', 'level': 'case', 'category': 'conditional', 'condition': 'Bank orders', 'required': False, 'display_order': 11, 'is_system': True},
        {'name': 'PDC Cheques', 'level': 'case', 'category': 'conditional', 'condition': 'Bank requirement', 'required': False, 'display_order': 12, 'is_system': True},
        {'name': 'MC Cheque', 'level': 'case', 'category': 'conditional', 'condition': 'Down payment proof', 'required': False, 'display_order': 13, 'is_system': True},
        {'name': 'Payment Receipt', 'level': 'case', 'category': 'conditional', 'condition': 'Payments made', 'required': False, 'display_order': 14, 'is_system': True},
    ]

    for doc_type in document_types:
        DocumentType.objects.create(
            id=uuid.uuid4(),
            **doc_type
        )


def reverse_seed(apps, schema_editor):
    """Remove seeded document types."""
    DocumentType = apps.get_model('documents', 'DocumentType')
    DocumentType.objects.filter(is_system=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0003_add_document_categories'),
    ]

    operations = [
        migrations.RunPython(seed_document_types, reverse_seed),
    ]
