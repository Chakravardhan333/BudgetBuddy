from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date
from notifications.models import Notification
from transactions.models import Budget, Expense, SavingsGoal

class NotificationsModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='notify_user', email='notify@budgetbuddy.test', password='Password123!'
        )
        login_res = self.client.post(reverse('login'), {'username': 'notify_user', 'password': 'Password123!'})
        self.token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        self.list_url = reverse('notification_list')
        self.count_url = reverse('notification_unread_count')
        self.mark_all_url = reverse('notification_mark_all_read')

    def test_notification_auto_trigger_and_deduplication(self):
        today = date.today()
        # Set budget of 100
        Budget.objects.create(user=self.user, month=today.month, year=today.year, monthly_limit=Decimal('100.00'))
        # Expense of 85 (85% utilization -> triggers threshold warning)
        Expense.objects.create(user=self.user, amount=Decimal('85.00'), date=today, description='Shopping test')

        # First request evaluates triggers and creates notification
        res1 = self.client.get(self.list_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(res1.data), 1)
        warning_notif = next((n for n in res1.data if 'Threshold Warning' in n['title']), None)
        self.assertIsNotNone(warning_notif)
        self.assertFalse(warning_notif['is_read'])

        # Second request must NOT duplicate the notification
        res2 = self.client.get(self.list_url)
        self.assertEqual(len(res2.data), len(res1.data))

    def test_mark_as_read_workflow(self):
        notif = Notification.objects.create(
            user=self.user, title='Test Alert', message='Test message', is_read=False
        )

        # Check unread count
        count_res = self.client.get(self.count_url)
        self.assertEqual(count_res.data['unread_count'], 1)

        # Mark single as read
        read_url = reverse('notification_mark_read', kwargs={'pk': notif.id})
        res_mark = self.client.post(read_url)
        self.assertEqual(res_mark.status_code, status.HTTP_200_OK)

        # Verify updated count
        count_after = self.client.get(self.count_url)
        self.assertEqual(count_after.data['unread_count'], 0)

    def test_mark_all_read(self):
        Notification.objects.create(user=self.user, title='A1', message='M1', is_read=False)
        Notification.objects.create(user=self.user, title='A2', message='M2', is_read=False)

        res_mark_all = self.client.post(self.mark_all_url)
        self.assertEqual(res_mark_all.status_code, status.HTTP_200_OK)

        count = self.client.get(self.count_url)
        self.assertEqual(count.data['unread_count'], 0)
