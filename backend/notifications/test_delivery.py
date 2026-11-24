from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
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
