from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('acquisition_channels', '0009_remove_team_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='channel',
            name='monthly_spend',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Monthly marketing spend for this channel in AED',
                max_digits=12,
                null=True,
            ),
        ),
    ]
