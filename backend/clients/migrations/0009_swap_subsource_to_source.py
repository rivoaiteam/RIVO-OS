# Generated manually for 2-tier channel flattening
# Swap sub_source FK to source FK on Client model

from django.db import migrations, models
import django.db.models.deletion


def migrate_client_subsource_to_source(apps, schema_editor):
    """Set source_id = sub_source's parent source_id for all clients using raw SQL."""
    schema_editor.execute(
        """
        UPDATE clients
        SET source_id = sub_sources.source_id
        FROM sub_sources
        WHERE clients.sub_source_id = sub_sources.id
          AND clients.sub_source_id IS NOT NULL
        """
    )


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0008_merge_20260122_0937'),
        ('acquisition_channels', '0005_flatten_to_two_tier'),
    ]

    operations = [
        # Add nullable source FK
        migrations.AddField(
            model_name='client',
            name='source',
            field=models.ForeignKey(
                help_text='Source where client originated',
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='clients',
                to='acquisition_channels.source',
            ),
        ),

        # Copy data from sub_source to source using raw SQL
        migrations.RunPython(
            migrate_client_subsource_to_source,
            migrations.RunPython.noop,
        ),

        # Remove old sub_source index and field
        migrations.RemoveIndex(
            model_name='client',
            name='clients_sub_source_idx',
        ),
        migrations.RemoveField(
            model_name='client',
            name='sub_source',
        ),

        # Make source non-nullable (required)
        migrations.AlterField(
            model_name='client',
            name='source',
            field=models.ForeignKey(
                help_text='Source where client originated',
                on_delete=django.db.models.deletion.PROTECT,
                related_name='clients',
                to='acquisition_channels.source',
            ),
        ),

        # Add new index
        migrations.AddIndex(
            model_name='client',
            index=models.Index(fields=['source'], name='clients_source_idx'),
        ),
    ]
