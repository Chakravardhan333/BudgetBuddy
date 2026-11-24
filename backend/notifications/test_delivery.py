import os
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from django.utils import timezone
from notifications.models import Reminder
from notifications.services import deliver_scheduled_reminders
from rest_framework.test import APIClient
from django.urls import reverse


class NotificationChannelTestEndpointTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="channel_test_user",
            email="channel-test@example.com",
            password="StrongPassword123!",
        )
        self.client = APIClient()
        response = self.client.post(
            reverse("login"),
            {"username": "channel_test_user", "password": "StrongPassword123!"},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
        EMAIL_HOST="smtp-relay.brevo.com",
        EMAIL_HOST_USER="test-login",
        EMAIL_HOST_PASSWORD="test-secret",
        DEFAULT_FROM_EMAIL="BudgetBuddy <verified@example.com>",
    )
    @patch("notifications.views.send_mail", return_value=1)
    def test_email_test_sends_only_to_authenticated_user(self, mock_send_mail):
        response = self.client.post(reverse("notification_email_test"), {}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["recipient"], self.user.email)
        self.assertEqual(mock_send_mail.call_args.kwargs["recipient_list"], [self.user.email])

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.console.EmailBackend",
        EMAIL_HOST_USER="test-login",
        EMAIL_HOST_PASSWORD="test-secret",
    )
    def test_email_test_rejects_console_backend(self):
        response = self.client.post(reverse("notification_email_test"), {}, format="json")
        self.assertEqual(response.status_code, 503)

    def test_sms_test_requires_explicit_confirmation(self):
        response = self.client.post(reverse("notification_sms_test"), {}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.data["success"])

    def test_rescheduling_resets_all_delivery_channels(self):
        reminder = Reminder.objects.create(
            user=self.user,
            title="Rescheduled bill",
            reminder_datetime=timezone.now() - timedelta(minutes=1),
            notification_delivered=True,
            email_delivered=True,
            sms_delivered=True,
        )
        new_time = (timezone.now() + timedelta(hours=1)).isoformat()
        response = self.client.patch(
            reverse("reminder_detail", kwargs={"pk": reminder.pk}),
            {"reminder_datetime": new_time},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        reminder.refresh_from_db()
        self.assertFalse(reminder.notification_delivered)
        self.assertFalse(reminder.email_delivered)
        self.assertFalse(reminder.sms_delivered)

    def test_snoozing_resets_all_delivery_channels(self):
        reminder = Reminder.objects.create(
            user=self.user,
            title="Snoozed bill",
            reminder_datetime=timezone.now() - timedelta(minutes=1),
            notification_delivered=True,
            email_delivered=True,
            sms_delivered=True,
        )
        response = self.client.post(
            reverse("reminder_snooze", kwargs={"pk": reminder.pk}),
            {"minutes": 30},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        reminder.refresh_from_db()
        self.assertFalse(reminder.notification_delivered)
        self.assertFalse(reminder.email_delivered)
        self.assertFalse(reminder.sms_delivered)



class ScheduledReminderChannelDeliveryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="scheduled_channel_user",
            email="scheduled-channel@example.com",
            password="StrongPassword123!",
        )
        self.user.profile.phone_number = "+919876543210"
        self.user.profile.sms_notifications_enabled = True
        self.user.profile.save()

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
        EMAIL_HOST="smtp-relay.brevo.com",
        EMAIL_HOST_USER="test-login",
        EMAIL_HOST_PASSWORD="test-secret",
        DEFAULT_FROM_EMAIL="BudgetBuddy <verified@example.com>",
    )
    @patch.dict(os.environ, {"MSG91_AUTH_KEY": "test-auth", "MSG91_TEMPLATE_ID": "test-template"})
    @patch("notifications.services.send_msg91_reminder_sms", return_value=True)
    @patch("notifications.services.send_mail", return_value=1)
    def test_due_reminder_uses_email_and_sms_when_user_opted_in(
        self, mock_send_mail, mock_send_sms
    ):
        reminder = Reminder.objects.create(
            user=self.user,
            title="Electricity bill",
            message="Pay the bill today",
            reminder_datetime=timezone.now() - timedelta(minutes=1),
        )

        result = deliver_scheduled_reminders()

        reminder.refresh_from_db()
        self.assertEqual(result["processed"], 1)
        self.assertTrue(reminder.email_delivered)
        self.assertTrue(reminder.sms_delivered)
        mock_send_mail.assert_called_once()
        mock_send_sms.assert_called_once()

    @override_settings(
        EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
        EMAIL_HOST="smtp-relay.brevo.com",
        EMAIL_HOST_USER="test-login",
        EMAIL_HOST_PASSWORD="test-secret",
        DEFAULT_FROM_EMAIL="BudgetBuddy <verified@example.com>",
    )
    @patch.dict(os.environ, {"MSG91_AUTH_KEY": "test-auth", "MSG91_TEMPLATE_ID": "test-template"})
    @patch("notifications.services.send_msg91_reminder_sms")
    @patch("notifications.services.send_mail", return_value=1)
    def test_due_reminder_does_not_send_sms_without_opt_in(
        self, mock_send_mail, mock_send_sms
    ):
        self.user.profile.sms_notifications_enabled = False
        self.user.profile.save()
        Reminder.objects.create(
            user=self.user,
            title="Rent",
            reminder_datetime=timezone.now() - timedelta(minutes=1),
        )

        deliver_scheduled_reminders()

        mock_send_mail.assert_called_once()
        mock_send_sms.assert_not_called()
