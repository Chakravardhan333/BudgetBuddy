from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('notifications', '0006_notification_category_notification_read_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='reminder',
            name='email_delivered',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='reminder',
            name='sms_delivered',
            field=models.BooleanField(default=False),
        ),
    ]
