# Generated manually for 2-tier channel flattening
# Swap sub_source FK to source FK on Lead model

from django.db import migrations, models
import django.db.models.deletion


def migrate_lead_subsource_to_source(apps, schema_editor):
    """Set source = sub_source.source for all leads."""
    Lead = apps.get_model('leads', 'Lead')
    for lead in Lead.objects.select_related('sub_source').all():
        if lead.sub_source_id:
            lead.source_id = lead.sub_source.source_id
            lead.save(update_fields=['source_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('leads', '0002_add_campaign_tracking'),
        ('acquisition_channels', '0005_flatten_to_two_tier'),
    ]

    operations = [
        # Add nullable source FK
        migrations.AddField(
            model_name='lead',
            name='source',
            field=models.ForeignKey(
                help_text='Source this lead came from (must be untrusted channel)',
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='leads',
                to='acquisition_channels.source',
            ),
        ),

        # Copy data from sub_source to source
        migrations.RunPython(
            migrate_lead_subsource_to_source,
            migrations.RunPython.noop,
        ),

        # Remove old sub_source index and field
        migrations.RemoveIndex(
            model_name='lead',
            name='leads_sub_source_idx',
        ),
        migrations.RemoveField(
            model_name='lead',
            name='sub_source',
        ),

        # Make source non-nullable (required)
        migrations.AlterField(
            model_name='lead',
            name='source',
            field=models.ForeignKey(
                help_text='Source this lead came from (must be untrusted channel)',
                on_delete=django.db.models.deletion.PROTECT,
                related_name='leads',
                to='acquisition_channels.source',
            ),
        ),

        # Add new index
        migrations.AddIndex(
            model_name='lead',
            index=models.Index(fields=['source'], name='leads_source_idx'),
        ),
    ]
