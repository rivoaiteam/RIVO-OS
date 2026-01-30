"""
Rename app label from templates_app to templates in Django metadata tables.
"""

from django.db import migrations


def rename_app_label(apps, schema_editor):
    """Update django_content_type and django_migrations tables."""
    db_alias = schema_editor.connection.alias

    # Update content types
    schema_editor.execute(
        "UPDATE django_content_type SET app_label = 'templates' WHERE app_label = 'templates_app'"
    )

    # Update migration records
    schema_editor.execute(
        "UPDATE django_migrations SET app = 'templates' WHERE app = 'templates_app'"
    )


def reverse_rename(apps, schema_editor):
    """Reverse: rename back to templates_app."""
    schema_editor.execute(
        "UPDATE django_content_type SET app_label = 'templates_app' WHERE app_label = 'templates'"
    )
    schema_editor.execute(
        "UPDATE django_migrations SET app = 'templates_app' WHERE app = 'templates'"
    )


class Migration(migrations.Migration):

    dependencies = [
        ('templates', '0002_change_loan_update_to_application_update'),
    ]

    operations = [
        migrations.RunPython(rename_app_label, reverse_rename),
    ]
