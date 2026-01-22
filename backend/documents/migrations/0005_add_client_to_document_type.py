# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
        ('documents', '0004_seed_document_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='documenttype',
            name='client',
            field=models.ForeignKey(
                blank=True,
                help_text='Client this custom document type belongs to (null for system types)',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='custom_document_types',
                to='clients.client',
            ),
        ),
    ]
