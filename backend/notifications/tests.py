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

    def test_reminder_crud_and_status_transitions(self):
        from django.utils import timezone
        now = timezone.now()
        due_time = now + timezone.timedelta(hours=2)

        # 1. Create Reminder
        create_payload = {
            'title': 'Pay Credit Card Bill',
            'message': 'Minimum payment due $150',
            'category': 'bill',
            'priority': 'high',
            'reminder_datetime': due_time.isoformat(),
        }
        res_create = self.client.post(reverse('reminder_list_create'), create_payload, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        reminder_id = res_create.data['id']
        self.assertEqual(res_create.data['title'], 'Pay Credit Card Bill')
        self.assertEqual(res_create.data['priority'], 'high')
        self.assertEqual(res_create.data['category'], 'bill')
        self.assertFalse(res_create.data['is_completed'])
        self.assertTrue(res_create.data['is_upcoming'])

        # 2. Get Reminder Detail
        detail_url = reverse('reminder_detail', kwargs={'pk': reminder_id})
        res_get = self.client.get(detail_url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_get.data['id'], reminder_id)

        # 3. PATCH / PUT Reminder (Edit)
        res_patch = self.client.patch(detail_url, {'title': 'Pay Electricity Bill', 'priority': 'urgent'}, format='json')
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(res_patch.data['title'], 'Pay Electricity Bill')
        self.assertEqual(res_patch.data['priority'], 'urgent')

        # 4. Snooze Reminder (10 minutes)
        snooze_url = reverse('reminder_snooze', kwargs={'pk': reminder_id})
        res_snooze_10m = self.client.post(snooze_url, {'minutes': 10}, format='json')
        self.assertEqual(res_snooze_10m.status_code, status.HTTP_200_OK)
        self.assertEqual(res_snooze_10m.data['reminder']['snooze_count'], 1)

        # 5. Snooze Reminder (1 hour)
        res_snooze_1h = self.client.post(snooze_url, {'hours': 1}, format='json')
        self.assertEqual(res_snooze_1h.status_code, status.HTTP_200_OK)
        self.assertEqual(res_snooze_1h.data['reminder']['snooze_count'], 2)

        # 6. Snooze Reminder (1 day)
        res_snooze_1d = self.client.post(snooze_url, {'days': 1}, format='json')
        self.assertEqual(res_snooze_1d.status_code, status.HTTP_200_OK)
        self.assertEqual(res_snooze_1d.data['reminder']['snooze_count'], 3)

        # 7. Complete Reminder
        complete_url = reverse('reminder_complete', kwargs={'pk': reminder_id})
        res_comp = self.client.post(complete_url)
        self.assertEqual(res_comp.status_code, status.HTTP_200_OK)
        res_check_comp = self.client.get(detail_url)
        self.assertTrue(res_check_comp.data['is_completed'])

        # 8. Summary View
        summary_res = self.client.get(reverse('reminder_summary'))
        self.assertEqual(summary_res.status_code, status.HTTP_200_OK)
        self.assertEqual(summary_res.data['total'], 1)
        self.assertEqual(summary_res.data['completed'], 1)

        # 9. Delete Reminder
        res_del = self.client.delete(detail_url)
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        res_check_del = self.client.get(detail_url)
        self.assertEqual(res_check_del.status_code, status.HTTP_404_NOT_FOUND)

    def test_due_and_overdue_reminder_detection(self):
        from django.utils import timezone
        from notifications.models import Reminder
        now = timezone.now()

        # Reminder past due by 2 hours (overdue)
        overdue_reminder = Reminder.objects.create(
            user=self.user,
            title='Overdue Gym Membership',
            category='payment',
            priority='high',
            reminder_datetime=now - timezone.timedelta(hours=2)
        )
        # Upcoming reminder in 30 minutes
        upcoming_reminder = Reminder.objects.create(
            user=self.user,
            title='Quarterly Taxes',
            category='financial',
            priority='urgent',
            reminder_datetime=now + timezone.timedelta(minutes=30)
        )

        # Query due reminders API
        due_res = self.client.get(reverse('reminder_due'))
        self.assertEqual(due_res.status_code, status.HTTP_200_OK)
        due_ids = [r['id'] for r in due_res.data]
        self.assertIn(overdue_reminder.id, due_ids)
        self.assertNotIn(upcoming_reminder.id, due_ids)

        # Verify trigger_user_notifications auto-generates alert for overdue/due reminder
        list_res = self.client.get(self.list_url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        titles = [n['title'] for n in list_res.data]
        self.assertTrue(any('Overdue Gym Membership' in t for t in titles))
