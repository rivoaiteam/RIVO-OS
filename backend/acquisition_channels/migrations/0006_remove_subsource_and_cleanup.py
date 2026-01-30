# Generated manually for 2-tier channel flattening
# Final cleanup: fix column type, copy SubSource data to Source, remove is_active, delete SubSource


import django.db.models.deletion
from django.db import migrations, models


def fix_linked_user_column_and_copy_data(apps, schema_editor):
    """
    The linked_user FK was added with integer type (from settings.AUTH_USER_MODEL
    resolving to auth.User) but our User model uses UUID PK. Drop and recreate
    the column with UUID type, then copy data from SubSource.
    """
    # Drop the integer linked_user_id column and its constraints
    schema_editor.execute(
        """
        ALTER TABLE sources DROP COLUMN IF EXISTS linked_user_id
        """
    )

    # Recreate as UUID type
    schema_editor.execute(
        """
        ALTER TABLE sources ADD COLUMN linked_user_id uuid NULL
        """
    )

    # Add FK constraint to users table
    schema_editor.execute(
        """
        ALTER TABLE sources ADD CONSTRAINT sources_linked_user_fk
        FOREIGN KEY (linked_user_id) REFERENCES users(id)
        ON DELETE SET NULL
        DEFERRABLE INITIALLY DEFERRED
        """
    )

    # Copy linked_user_id from sub_sources to their parent sources
    schema_editor.execute(
        """
        UPDATE sources
        SET linked_user_id = (
            SELECT ss.linked_user_id
            FROM sub_sources ss
            WHERE ss.source_id = sources.id
              AND ss.linked_user_id IS NOT NULL
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM sub_sources ss
            WHERE ss.source_id = sources.id
              AND ss.linked_user_id IS NOT NULL
        )
        """
    )

    # Map SubSource status to Source status
    # active/live -> 'active', everything else -> 'inactive'
    schema_editor.execute(
        """
        UPDATE sources
        SET status = (
            SELECT CASE
                WHEN ss.status IN ('active', 'live') THEN 'active'
                ELSE 'inactive'
            END
            FROM sub_sources ss
            WHERE ss.source_id = sources.id
            LIMIT 1
        )
        WHERE EXISTS (
            SELECT 1 FROM sub_sources ss
            WHERE ss.source_id = sources.id
        )
        """
    )


class Migration(migrations.Migration):

    dependencies = [
        ('acquisition_channels', '0005_flatten_to_two_tier'),
        ('leads', '0003_swap_subsource_to_source'),
        ('clients', '0009_swap_subsource_to_source'),
        ('campaigns', '0003_swap_subsource_to_source'),
        ('users', '0001_initial'),
    ]

    operations = [
        # Fix the linked_user column type and copy data from SubSource
        migrations.RunPython(
            fix_linked_user_column_and_copy_data,
            migrations.RunPython.noop,
        ),

        # Remove is_active from Source (replaced by status field)
        migrations.RemoveField(
            model_name='source',
            name='is_active',
        ),

        # Delete SubSource model
        migrations.DeleteModel(
            name='SubSource',
        ),
    ]
