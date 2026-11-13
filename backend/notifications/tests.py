from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date
from django.utils import timezone
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

    def test_delete_individual_notification(self):
        notif = Notification.objects.create(
            user=self.user, title='Delete Me', message='Delete test', category='system', is_read=False
        )
        del_url = reverse('notification_detail', kwargs={'pk': notif.id})
        res_del = self.client.delete(del_url)
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertFalse(Notification.objects.filter(id=notif.id).exists())

    def test_category_filtering_and_unread_breakdown(self):
        Notification.objects.create(user=self.user, title='R1', message='M', category='reminders', is_read=False)
        Notification.objects.create(user=self.user, title='B1', message='M', category='budgets', is_read=False)
        Notification.objects.create(user=self.user, title='E1', message='M', category='expenses', is_read=True)
        Notification.objects.create(user=self.user, title='P1', message='M', category='payments', is_read=False)

        # Filter by category
        res_budgets = self.client.get(f"{self.list_url}?category=budgets")
        self.assertEqual(res_budgets.status_code, status.HTTP_200_OK)
        self.assertTrue(all(n['category'] == 'budgets' for n in res_budgets.data))

        # Filter by is_read=false
        res_unread = self.client.get(f"{self.list_url}?is_read=false")
        self.assertEqual(res_unread.status_code, status.HTTP_200_OK)
        self.assertTrue(all(not n['is_read'] for n in res_unread.data))

        # Check unread count category breakdown
        count_res = self.client.get(self.count_url)
        self.assertEqual(count_res.status_code, status.HTTP_200_OK)
        self.assertIn('categories', count_res.data)
        self.assertEqual(count_res.data['categories']['reminders'], 1)
        self.assertEqual(count_res.data['categories']['budgets'], 1)
        self.assertEqual(count_res.data['categories']['expenses'], 0)

    def test_clear_read_notifications(self):
        Notification.objects.create(user=self.user, title='Read1', message='M', is_read=True)
        Notification.objects.create(user=self.user, title='Read2', message='M', is_read=True)
        n_unread = Notification.objects.create(user=self.user, title='Unread1', message='M', is_read=False)

        res_clear = self.client.post(reverse('notification_clear'))
        self.assertEqual(res_clear.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.filter(id=n_unread.id).exists())
        self.assertFalse(Notification.objects.filter(user=self.user, is_read=True).exists())

    def test_notification_user_isolation(self):
        other_user = User.objects.create_user(username='other_isolated', password='Password123!')
        other_notif = Notification.objects.create(user=other_user, title='Secret', message='Private', is_read=False)

        # Attempt to delete other user's notification -> 404 Not Found
        del_url = reverse('notification_detail', kwargs={'pk': other_notif.id})
        res_del = self.client.delete(del_url)
        self.assertEqual(res_del.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(Notification.objects.filter(id=other_notif.id).exists())

        # Attempt to mark other user's notification as read -> 404
        read_url = reverse('notification_mark_read', kwargs={'pk': other_notif.id})
        res_read = self.client.post(read_url)
        self.assertEqual(res_read.status_code, status.HTTP_404_NOT_FOUND)


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

    def test_reminder_validation_errors(self):
        # 1. Missing title -> returns 400 with 'title' error
        res1 = self.client.post(reverse('reminder_list_create'), {
            'reminder_datetime': '2026-11-10T10:00:00Z',
            'category': 'bill',
        }, format='json')
        self.assertEqual(res1.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', res1.data)

        # 2. Invalid datetime -> returns 400 with 'reminder_datetime' error
        res2 = self.client.post(reverse('reminder_list_create'), {
            'title': 'Test Reminder',
            'reminder_datetime': 'not-a-valid-date',
            'category': 'bill',
        }, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('reminder_datetime', res2.data)

        # 3. Valid creation without message (optional field)
        res3 = self.client.post(reverse('reminder_list_create'), {
            'title': 'No Note Reminder',
            'reminder_datetime': '2026-11-10T10:00:00Z',
            'category': 'payment',
            'priority': 'urgent',
        }, format='json')
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res3.data['message'], '')

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

    def test_reminder_notification_delivery_and_duplicate_prevention(self):
        from django.utils import timezone
        from notifications.models import Reminder
        now = timezone.now()

        # 1. Create a reminder due right now
        reminder = Reminder.objects.create(
            user=self.user,
            title='Electric Bill Due',
            message='Pay via net banking',
            category='bill',
            priority='high',
            reminder_datetime=now - timezone.timedelta(minutes=5),
        )
        self.assertFalse(reminder.notification_delivered)
        self.assertIsNone(reminder.last_notified_at)

        # 2. Both all-due and undelivered filters should include it
        res_due_all = self.client.get(reverse('reminder_due'))
        self.assertEqual(res_due_all.status_code, status.HTTP_200_OK)
        self.assertTrue(any(r['id'] == reminder.id for r in res_due_all.data))

        res_undelivered = self.client.get(f"{reverse('reminder_due')}?undelivered=true")
        self.assertEqual(res_undelivered.status_code, status.HTTP_200_OK)
        self.assertTrue(any(r['id'] == reminder.id for r in res_undelivered.data))

        # 3. Mark delivery via POST /delivered/
        deliv_res = self.client.post(reverse('reminder_mark_delivered', kwargs={'pk': reminder.id}))
        self.assertEqual(deliv_res.status_code, status.HTTP_200_OK)
        self.assertTrue(deliv_res.data['notification_delivered'])
        self.assertIsNotNone(deliv_res.data['last_notified_at'])

        reminder.refresh_from_db()
        self.assertTrue(reminder.notification_delivered)
        self.assertIsNotNone(reminder.last_notified_at)

        # 4. Undelivered query should now EXCLUDE it (duplicate prevention on server)
        res_undelivered_after = self.client.get(f"{reverse('reminder_due')}?undelivered=true")
        self.assertEqual(res_undelivered_after.status_code, status.HTTP_200_OK)
        self.assertFalse(any(r['id'] == reminder.id for r in res_undelivered_after.data))

        # Standard due still includes it for reference
        res_due_all_after = self.client.get(reverse('reminder_due'))
        self.assertTrue(any(r['id'] == reminder.id for r in res_due_all_after.data))

        # 5. Snoozing the reminder resets notification_delivered to False
        snooze_res = self.client.post(reverse('reminder_snooze', kwargs={'pk': reminder.id}), {'hours': 2})
        self.assertEqual(snooze_res.status_code, status.HTTP_200_OK)
        reminder.refresh_from_db()
        self.assertFalse(reminder.notification_delivered)
        self.assertEqual(reminder.snooze_count, 1)

        # 6. User isolation test: another user cannot mark or see this reminder
        other_user = User.objects.create_user(username='other_u', email='other@test.com', password='Password123!')
        other_client = APIClient()
        login_other = other_client.post(reverse('login'), {'username': 'other_u', 'password': 'Password123!'})
        other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {login_other.data['access']}")

        res_other_deliv = other_client.post(reverse('reminder_mark_delivered', kwargs={'pk': reminder.id}))
        self.assertEqual(res_other_deliv.status_code, status.HTTP_404_NOT_FOUND)

        res_other_due = other_client.get(reverse('reminder_due'))
        self.assertEqual(len(res_other_due.data), 0)

    def test_complete_or_delete_excludes_from_due(self):
        from django.utils import timezone
        from notifications.models import Reminder
        now = timezone.now()

        r1 = Reminder.objects.create(
            user=self.user,
            title='Internet Bill',
            reminder_datetime=now - timezone.timedelta(minutes=10)
        )
        r2 = Reminder.objects.create(
            user=self.user,
            title='Car Insurance',
            reminder_datetime=now - timezone.timedelta(minutes=15)
        )

        # Before completion, both are in due
        due_res = self.client.get(reverse('reminder_due'))
        self.assertEqual(due_res.status_code, status.HTTP_200_OK)
        due_ids = [r['id'] for r in due_res.data]
        self.assertIn(r1.id, due_ids)
        self.assertIn(r2.id, due_ids)

        # Complete r1 -> should not be in due
        self.client.post(reverse('reminder_complete', kwargs={'pk': r1.id}))
        due_res2 = self.client.get(reverse('reminder_due'))
        due_ids2 = [r['id'] for r in due_res2.data]
        self.assertNotIn(r1.id, due_ids2)
        self.assertIn(r2.id, due_ids2)

        # Delete r2 -> should not be in due
        self.client.delete(reverse('reminder_detail', kwargs={'pk': r2.id}))
        due_res3 = self.client.get(reverse('reminder_due'))
        due_ids3 = [r['id'] for r in due_res3.data]
        self.assertNotIn(r2.id, due_ids3)
        self.assertEqual(len(due_ids3), 0)

    def test_multiple_reminders_batch_delivery(self):
        from django.utils import timezone
        from notifications.models import Reminder
        now = timezone.now()

        # Create 3 due reminders
        r1 = Reminder.objects.create(user=self.user, title='R1', category='bill', priority='urgent', reminder_datetime=now - timezone.timedelta(minutes=5))
        r2 = Reminder.objects.create(user=self.user, title='R2', category='payment', priority='high', reminder_datetime=now - timezone.timedelta(minutes=3))
        r3 = Reminder.objects.create(user=self.user, title='R3', category='budget', priority='medium', reminder_datetime=now - timezone.timedelta(minutes=1))

        # Query due reminders
        due_res = self.client.get(reverse('reminder_due'))
        self.assertEqual(due_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(due_res.data), 3)

        # Mark all 3 as delivered
        for r in [r1, r2, r3]:
            res = self.client.post(reverse('reminder_mark_delivered', kwargs={'pk': r.id}))
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertTrue(res.data['notification_delivered'])

        # Undelivered query should now return 0
        undeliv_res = self.client.get(f"{reverse('reminder_due')}?undelivered=true")
        self.assertEqual(len(undeliv_res.data), 0)

    def test_all_reminder_categories_and_priorities_lifecycle(self):
        categories = ['payment', 'bill', 'savings', 'personal', 'budget', 'expense', 'financial']
        priorities = ['urgent', 'high', 'medium', 'low']

        # 1. Test creation of all 7 categories with all 4 priorities
        for cat in categories:
            res = self.client.post(reverse('reminder_list_create'), {
                'title': f'{cat.capitalize()} test reminder',
                'category': cat,
                'priority': 'medium',
                'note': f'Optional details for {cat}',
                'reminder_datetime': '2026-11-20T10:00:00Z',
            }, format='json')
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            self.assertEqual(res.data['category'], cat)
            self.assertEqual(res.data['message'], f'Optional details for {cat}')
            self.assertEqual(res.data['description'], f'Optional details for {cat}')

        for pri in priorities:
            res = self.client.post(reverse('reminder_list_create'), {
                'title': f'{pri.capitalize()} priority reminder',
                'category': 'bill',
                'priority': pri,
                'description': f'Testing {pri}',
                'reminder_datetime': '2026-11-20T12:00:00Z',
            }, format='json')
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            self.assertEqual(res.data['priority'], pri)

        # 2. Test edit existing reminder
        first_rem = self.client.get(reverse('reminder_list_create')).data[0]
        edit_res = self.client.put(reverse('reminder_detail', kwargs={'pk': first_rem['id']}), {
            'title': 'Updated Title',
            'priority': 'urgent',
            'message': 'Updated message details',
            'reminder_datetime': '2026-11-25T15:00:00Z',
        }, format='json')
        self.assertEqual(edit_res.status_code, status.HTTP_200_OK)
        self.assertEqual(edit_res.data['title'], 'Updated Title')
        self.assertEqual(edit_res.data['priority'], 'urgent')

        # 3. Test snooze reminder
        snooze_res = self.client.post(reverse('reminder_snooze', kwargs={'pk': first_rem['id']}), {'minutes': 30})
        self.assertEqual(snooze_res.status_code, status.HTTP_200_OK)
        self.assertEqual(snooze_res.data['reminder']['snooze_count'], 1)

        # 4. Test mark completed
        comp_res = self.client.post(reverse('reminder_complete', kwargs={'pk': first_rem['id']}))
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)

        # 5. Test summary endpoint
        sum_res = self.client.get(reverse('reminder_summary'))
        self.assertEqual(sum_res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(sum_res.data['total'], len(categories))
        self.assertGreaterEqual(sum_res.data['completed'], 1)


class WebPushModuleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='push_user', email='push@budgetbuddy.test', password='Password123!'
        )
        login_res = self.client.post(reverse('login'), {'username': 'push_user', 'password': 'Password123!'})
        self.token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        self.user2 = User.objects.create_user(
            username='other_user', email='other@budgetbuddy.test', password='Password123!'
        )

    def test_vapid_public_key_endpoint(self):
        res = self.client.get(reverse('push_vapid_key'))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('public_key', res.data)
        self.assertTrue(len(res.data['public_key']) > 20)

    def test_push_subscription_registration_and_multi_device(self):
        from notifications.models import PushSubscription

        # 1. Register device 1 (nested browser keys format)
        payload1 = {
            'endpoint': 'https://fcm.googleapis.com/fcm/send/device1',
            'keys': {
                'p256dh': 'p256dh_sample_key_1',
                'auth': 'auth_sample_secret_1',
            },
            'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
        }
        res1 = self.client.post(reverse('push_subscribe'), payload1, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res1.data['created'])

        # 2. Register device 2 (flat format)
        payload2 = {
            'endpoint': 'https://updates.push.services.mozilla.com/wpush/v2/device2',
            'p256dh': 'p256dh_sample_key_2',
            'auth': 'auth_sample_secret_2',
            'user_agent': 'Mozilla/5.0 (Android; Mobile) Firefox/120',
        }
        res2 = self.client.post(reverse('push_subscribe'), payload2, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # Total subscriptions for user should be 2
        self.assertEqual(PushSubscription.objects.filter(user=self.user).count(), 2)

        # 3. Re-register device 1 with updated keys -> should update in place, not duplicate
        payload1_updated = {
            'endpoint': 'https://fcm.googleapis.com/fcm/send/device1',
            'keys': {
                'p256dh': 'p256dh_sample_key_1_updated',
                'auth': 'auth_sample_secret_1_updated',
            },
        }
        res3 = self.client.post(reverse('push_subscribe'), payload1_updated, format='json')
        self.assertEqual(res3.status_code, status.HTTP_200_OK)
        self.assertFalse(res3.data['created'])
        self.assertEqual(PushSubscription.objects.filter(user=self.user).count(), 2)

        # 4. Check status endpoint
        status_res = self.client.get(reverse('push_status'))
        self.assertEqual(status_res.status_code, status.HTTP_200_OK)
        self.assertTrue(status_res.data['is_subscribed'])
        self.assertEqual(status_res.data['count'], 2)

    def test_push_unsubscription_single_and_all(self):
        from notifications.models import PushSubscription

        PushSubscription.objects.create(
            user=self.user,
            endpoint='https://fcm.googleapis.com/fcm/send/sub1',
            p256dh='k1', auth='a1'
        )
        PushSubscription.objects.create(
            user=self.user,
            endpoint='https://fcm.googleapis.com/fcm/send/sub2',
            p256dh='k2', auth='a2'
        )

        # Unsubscribe sub1
        res_del = self.client.delete(reverse('push_subscribe'), {'endpoint': 'https://fcm.googleapis.com/fcm/send/sub1'}, format='json')
        self.assertEqual(res_del.status_code, status.HTTP_200_OK)
        self.assertEqual(res_del.data['deleted_count'], 1)
        self.assertEqual(PushSubscription.objects.filter(user=self.user).count(), 1)

        # POST unsubscribe all remaining
        res_unsub = self.client.post(reverse('push_unsubscribe'), {}, format='json')
        self.assertEqual(res_unsub.status_code, status.HTTP_200_OK)
        self.assertEqual(res_unsub.data['deleted_count'], 1)
        self.assertEqual(PushSubscription.objects.filter(user=self.user).count(), 0)

    def test_scheduled_reminder_push_delivery_and_deduplication(self):
        from unittest.mock import patch
        from django.utils import timezone
        from notifications.models import Reminder, PushSubscription
        from notifications.services import deliver_scheduled_reminders

        sub = PushSubscription.objects.create(
            user=self.user,
            endpoint='https://fcm.googleapis.com/fcm/send/test-sub',
            p256dh='test-key',
            auth='test-auth'
        )

        now = timezone.now()
        # Create due reminder
        r1 = Reminder.objects.create(
            user=self.user,
            title='Pay Health Insurance',
            message='Annual insurance premium due $500',
            category='bill',
            priority='urgent',
            reminder_datetime=now - timezone.timedelta(minutes=5),
            notification_delivered=False,
        )

        # Create future reminder (should not be delivered)
        r2 = Reminder.objects.create(
            user=self.user,
            title='Upcoming Utility Bill',
            reminder_datetime=now + timezone.timedelta(days=2),
            notification_delivered=False,
        )

        # Deliver scheduled reminders with mock send_web_push
        with patch('notifications.services.send_web_push', return_value=True) as mock_send:
            res1 = deliver_scheduled_reminders()
            self.assertEqual(res1['processed'], 1)
            self.assertEqual(mock_send.call_count, 1)

            # Reminder should now be marked delivered
            r1.refresh_from_db()
            self.assertTrue(r1.notification_delivered)
            self.assertIsNotNone(r1.last_notified_at)

            # Future reminder should remain undelivered
            r2.refresh_from_db()
            self.assertFalse(r2.notification_delivered)

            # Second call immediately after should deliver 0 (Deduplication!)
            res2 = deliver_scheduled_reminders()
            self.assertEqual(res2['processed'], 0)
            self.assertEqual(mock_send.call_count, 1) # Still 1, not called again

    def test_snoozed_reminder_triggers_push_again(self):
        from unittest.mock import patch
        from django.utils import timezone
        from notifications.models import Reminder, PushSubscription
        from notifications.services import deliver_scheduled_reminders

        PushSubscription.objects.create(
            user=self.user,
            endpoint='https://fcm.googleapis.com/fcm/send/snooze-test',
            p256dh='k', auth='a'
        )

        now = timezone.now()
        r = Reminder.objects.create(
            user=self.user,
            title='Snooze Push Test',
            reminder_datetime=now - timezone.timedelta(minutes=2),
            notification_delivered=False,
        )

        with patch('notifications.services.send_web_push', return_value=True):
            res = deliver_scheduled_reminders()
            self.assertEqual(res['processed'], 1)

        r.refresh_from_db()
        self.assertTrue(r.notification_delivered)

        # Snooze reminder by 15 minutes (sets notification_delivered back to False)
        snooze_res = self.client.post(reverse('reminder_snooze', kwargs={'pk': r.id}), {'minutes': 15})
        self.assertEqual(snooze_res.status_code, status.HTTP_200_OK)

        r.refresh_from_db()
        self.assertFalse(r.notification_delivered)
        self.assertEqual(r.snooze_count, 1)

    def test_expired_subscription_auto_cleanup(self):
        from pywebpush import WebPushException
        from unittest.mock import patch, MagicMock
        from notifications.models import PushSubscription
        from notifications.services import send_web_push

        sub = PushSubscription.objects.create(
            user=self.user,
            endpoint='https://fcm.googleapis.com/fcm/send/expired-sub',
            p256dh='k', auth='a'
        )
        self.assertEqual(PushSubscription.objects.filter(id=sub.id).count(), 1)

        # Mock webpush raising 410 Gone (Subscription expired)
        mock_response = MagicMock()
        mock_response.status_code = 410
        mock_exc = WebPushException("Push subscription has expired", response=mock_response)

        with patch('pywebpush.webpush', side_effect=mock_exc):
            success = send_web_push(sub, {"title": "Test"})
            self.assertFalse(success)

            # Subscription should be automatically deleted from DB!
            self.assertEqual(PushSubscription.objects.filter(id=sub.id).count(), 0)

    def test_expense_and_income_lifecycle_notifications(self):
        # 1. Create expense
        res_exp = self.client.post('/api/transactions/expenses/', {
            'amount': '45.50',
            'category_name': 'Groceries',
            'date': date.today().isoformat(),
            'description': 'Weekly market shopping',
        })
        self.assertEqual(res_exp.status_code, status.HTTP_201_CREATED)
        exp_id = res_exp.data['id']

        notif_exp = Notification.objects.filter(user=self.user, category='expenses').first()
        self.assertIsNotNone(notif_exp)
        self.assertIn('Expense Added', notif_exp.title)
        self.assertIn('45.50', notif_exp.message)

        # Delete expense
        res_del_exp = self.client.delete(f'/api/transactions/expenses/{exp_id}/')
        self.assertEqual(res_del_exp.status_code, status.HTTP_204_NO_CONTENT)
        notif_del_exp = Notification.objects.filter(user=self.user, title='Expense Removed').first()
        self.assertIsNotNone(notif_del_exp)

        # 2. Create income
        res_inc = self.client.post('/api/transactions/income/', {
            'amount': '1500.00',
            'source': 'freelance',
            'date': date.today().isoformat(),
            'description': 'Web design milestone',
        })
        self.assertEqual(res_inc.status_code, status.HTTP_201_CREATED)
        inc_id = res_inc.data['id']

        notif_inc = Notification.objects.filter(user=self.user, category='payments', title__icontains='Income Recorded').first()
        self.assertIsNotNone(notif_inc)
        self.assertIn('1500.00', notif_inc.message)

        # Delete income
        res_del_inc = self.client.delete(f'/api/transactions/income/{inc_id}/')
        self.assertEqual(res_del_inc.status_code, status.HTTP_204_NO_CONTENT)
        notif_del_inc = Notification.objects.filter(user=self.user, title='Income Entry Removed').first()
        self.assertIsNotNone(notif_del_inc)

    def test_savings_goal_contribution_and_deadline_notification(self):
        # Create savings goal due in 4 days
        goal = SavingsGoal.objects.create(
            user=self.user,
            title='Emergency Fund',
            target_amount=Decimal('1000.00'),
            current_amount=Decimal('0.00'),
            target_date=date.today() + timezone.timedelta(days=4)
        )

        # Contribute to goal
        res_contribute = self.client.post(f'/api/transactions/goals/{goal.id}/contribute/', {
            'amount': '250.00',
            'date': date.today().isoformat(),
            'notes': 'Quarterly deposit'
        })
        self.assertEqual(res_contribute.status_code, status.HTTP_201_CREATED)

        contrib_notif = Notification.objects.filter(user=self.user, title=f"Goal Contribution: {goal.title}").first()
        self.assertIsNotNone(contrib_notif)
        self.assertEqual(contrib_notif.category, 'payments')

        # Deadline approaching trigger
        from notifications.services import trigger_user_notifications
        trigger_user_notifications(self.user)
        deadline_notif = Notification.objects.filter(user=self.user, title__icontains='Deadline Approaching').first()
        self.assertIsNotNone(deadline_notif)
        self.assertIn('due in 4 day(s)', deadline_notif.message)

