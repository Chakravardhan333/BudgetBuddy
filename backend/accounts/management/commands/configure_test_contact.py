import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.conf import settings
from accounts.models import UserProfile


class Command(BaseCommand):
    help = "Configures the test contact details (email and phone) for a user from environment settings and marks them verified."

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default=None,
            help='Username of the account to configure. Defaults to the first active user or creates test_user.',
        )

    def handle(self, *args, **options):
        test_email = getattr(settings, 'TEST_CONTACT_EMAIL', '') or os.environ.get('TEST_CONTACT_EMAIL', '')
        test_phone = getattr(settings, 'TEST_CONTACT_PHONE', '') or os.environ.get('TEST_CONTACT_PHONE', '')

        if not test_email or not test_phone:
            self.stderr.write(self.style.ERROR(
                "TEST_CONTACT_EMAIL and TEST_CONTACT_PHONE must be defined in settings or environment."
            ))
            return

        username = options.get('username')
        if username:
            user = User.objects.filter(username=username).first()
            if not user:
                self.stderr.write(self.style.ERROR(f"User '{username}' does not exist."))
                return
        else:
            user = User.objects.filter(is_active=True).first()
            if not user:
                user = User.objects.create_user(
                    username='test_user',
                    email=test_email.strip().lower(),
                    password='TestPassword123!',
                    first_name='Test',
                    last_name='User',
                )
                self.stdout.write(self.style.SUCCESS("Created default test user 'test_user'."))

        # Update User email
        user.email = test_email.strip().lower()
        user.save(update_fields=['email'])

        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.phone_number = test_phone.strip()
        profile.is_email_verified = True
        profile.is_phone_verified = True
        profile.email_notifications_enabled = True
        profile.sms_notifications_enabled = True
        profile.save()

        self.stdout.write(self.style.SUCCESS(
            f"Successfully configured test contact for user '{user.username}':\n"
            f"  Email: {user.email} (verified: {profile.is_email_verified})\n"
            f"  Phone: {profile.phone_number} (verified: {profile.is_phone_verified})\n"
            f"  Email Notifications: {profile.email_notifications_enabled}\n"
            f"  SMS Notifications: {profile.sms_notifications_enabled}"
        ))

