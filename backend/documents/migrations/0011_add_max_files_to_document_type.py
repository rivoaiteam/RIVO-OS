"""
Add max_files field to DocumentType and set values per document type.

Also consolidates Emirates ID Front / Emirates ID Back into a single
"Emirates ID (front & back)" document type with max_files=2.
"""

from django.db import migrations, models


# Map of document type name (case-insensitive) → max_files value
MAX_FILES_MAP = {
    # Client-level documents
    'credit card statement (last month)': 6,
    'personal bank statements (last six months)': 12,
    'passport': 1,
    'emirates id (front & back)': 2,
    'uae residence visa': 1,
    'salary certificate': 1,
    'pay slips (last six months)': 12,
    # Case-level bank forms
    'account opening form': 5,
    'fts (fee terms sheet)': 5,
    'kfs (key facts statement)': 5,
    'valuation report': 5,
    'pdc cheques': 5,
    'mc cheque': 5,
}


def set_max_files_and_consolidate_emirates_id(apps, schema_editor):
    """Set max_files values and consolidate Emirates ID types."""
    DocumentType = apps.get_model('documents', 'DocumentType')
    ClientDocument = apps.get_model('documents', 'ClientDocument')
    CaseDocument = apps.get_model('documents', 'CaseDocument')

    # --- Consolidate Emirates ID Front / Back into single type ---
    # Find all Emirates ID Front and Emirates ID Back types (case-insensitive)
    front_types = list(DocumentType.objects.filter(name__iexact='Emirates ID Front'))
    back_types = list(DocumentType.objects.filter(name__iexact='Emirates ID Back'))

    if front_types or back_types:
        # For each unique (level, category) combo from the old types, find or create merged type
        combos = set()
        for dt in front_types + back_types:
            combos.add((dt.level, dt.category))

        for level, category in combos:
            # Try to find an existing "Emirates ID (front & back)" for this combo
            merged = DocumentType.objects.filter(
                name__iexact='Emirates ID (front & back)',
                level=level,
                category=category,
            ).first()

            if not merged:
                # Use the front type as template if available, otherwise back
                template = None
                for dt in front_types:
                    if dt.level == level and dt.category == category:
                        template = dt
                        break
                if not template:
                    for dt in back_types:
                        if dt.level == level and dt.category == category:
                            template = dt
                            break
                if template:
                    template.name = 'Emirates ID (front & back)'
                    template.save()
                    merged = template

            if merged:
                # Reassign ClientDocument records from old types to merged type
                old_front_ids = [dt.id for dt in front_types if dt.level == level and dt.category == category and dt.id != merged.id]
                old_back_ids = [dt.id for dt in back_types if dt.level == level and dt.category == category and dt.id != merged.id]
                old_ids = old_front_ids + old_back_ids

                if old_ids:
                    ClientDocument.objects.filter(document_type_id__in=old_ids).update(document_type=merged)
                    CaseDocument.objects.filter(document_type_id__in=old_ids).update(document_type=merged)

                    # Delete the old types that were not repurposed
                    DocumentType.objects.filter(id__in=old_ids).delete()

    # --- Set max_files values by name (case-insensitive, partial match) ---
    all_types = DocumentType.objects.all()
    for dt in all_types:
        name_lower = dt.name.lower()
        # Exact match first
        if name_lower in MAX_FILES_MAP:
            dt.max_files = MAX_FILES_MAP[name_lower]
            dt.save()
        else:
            # Partial match for variants (e.g. "Credit Card Statements" matches "credit card")
            for key, val in MAX_FILES_MAP.items():
                if key.startswith('credit card') and 'credit card' in name_lower:
                    dt.max_files = val
                    dt.save()
                    break
                elif key.startswith('personal bank') and 'personal bank' in name_lower:
                    dt.max_files = val
                    dt.save()
                    break
                elif key.startswith('pay slip') and 'pay slip' in name_lower:
                    dt.max_files = val
                    dt.save()
                    break


def reverse_max_files_and_consolidate(apps, schema_editor):
    """Reverse: reset all max_files to 1. Emirates ID consolidation is not reversed."""
    DocumentType = apps.get_model('documents', 'DocumentType')
    DocumentType.objects.all().update(max_files=1)


class Migration(migrations.Migration):

    dependencies = [
        ('documents', '0010_cleanup_duplicate_bank_docs'),
    ]

    operations = [
        migrations.AddField(
            model_name='documenttype',
            name='max_files',
            field=models.PositiveIntegerField(
                default=1,
                help_text='Maximum number of files allowed for this document type',
            ),
        ),
        migrations.RunPython(
            set_max_files_and_consolidate_emirates_id,
            reverse_max_files_and_consolidate,
        ),
    ]
