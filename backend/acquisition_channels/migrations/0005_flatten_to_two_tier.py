# Generated manually for 2-tier channel flattening
# Step 1: Add new fields to Source model, then remove is_active

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('acquisition_channels', '0004_add_source_sla'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add status field to Source
        migrations.AddField(
            model_name='source',
            name='status',
            field=models.CharField(
                choices=[('active', 'Active'), ('inactive', 'Inactive')],
                default='active',
                help_text='Source status: active or inactive',
                max_length=20,
            ),
        ),

        # Add linked_user FK to Source
        migrations.AddField(
            model_name='source',
            name='linked_user',
            field=models.ForeignKey(
                blank=True,
                help_text='Linked MS user (for BH Mortgage Team self-sourcing)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='linked_sources',
                to=settings.AUTH_USER_MODEL,
            ),
        ),

        # Add indexes for new fields
        migrations.AddIndex(
            model_name='source',
            index=models.Index(fields=['status'], name='sources_status_idx'),
        ),
        migrations.AddIndex(
            model_name='source',
            index=models.Index(fields=['linked_user'], name='sources_linked_user_idx'),
        ),
        migrations.AddIndex(
            model_name='source',
            index=models.Index(fields=['channel'], name='sources_channel_idx'),
        ),
    ]
