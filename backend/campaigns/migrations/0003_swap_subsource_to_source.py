# Generated manually for 2-tier channel flattening
# Swap sub_source FK to source FK on Campaign model

from django.db import migrations, models
import django.db.models.deletion


def migrate_campaign_subsource_to_source(apps, schema_editor):
    """Set source_id = sub_source's parent source_id for all campaigns using raw SQL."""
    schema_editor.execute(
        """
        UPDATE campaigns_campaign
        SET source_id = sub_sources.source_id
        FROM sub_sources
        WHERE campaigns_campaign.sub_source_id = sub_sources.id
          AND campaigns_campaign.sub_source_id IS NOT NULL
        """
    )


class Migration(migrations.Migration):

    dependencies = [
        ('campaigns', '0002_campaign_is_auto_discovered_campaign_last_synced_at_and_more'),
        ('acquisition_channels', '0005_flatten_to_two_tier'),
    ]

    operations = [
        # Add nullable source FK
        migrations.AddField(
            model_name='campaign',
            name='source',
            field=models.ForeignKey(
                blank=True,
                help_text='Attribution source for leads from this campaign',
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='campaigns',
                to='acquisition_channels.source',
            ),
        ),

        # Copy data from sub_source to source using raw SQL
        migrations.RunPython(
            migrate_campaign_subsource_to_source,
            migrations.RunPython.noop,
        ),

        # Remove old sub_source FK
        migrations.RemoveField(
            model_name='campaign',
            name='sub_source',
        ),
    ]
