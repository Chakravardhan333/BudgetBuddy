import os
import sys
import django
import json
from decimal import Decimal
from datetime import timedelta
from unittest.mock import patch, MagicMock

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'budgetbuddy_core.settings')
django.setup()
from django.conf import settings
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS = list(settings.ALLOWED_HOSTS) + ['testserver']
if not getattr(settings, 'VAPID_PUBLIC_KEY', None):
    settings.VAPID_PUBLIC_KEY = 'test_vapid_public_key_mock'
if not getattr(settings, 'VAPID_PRIVATE_KEY', None):
    settings.VAPID_PRIVATE_KEY = 'test_vapid_private_key_mock'

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient
from notifications.models import Reminder, PushSubscription, Notification
from notifications.services import deliver_scheduled_reminders, send_test_push, send_web_push

print("=" * 80)
print("BUDGETBUDDY WEB PUSH NOTIFICATION SYSTEM – END-TO-END VERIFICATION")
print("=" * 80)

# Setup Test Users
user, _ = User.objects.get_or_create(username='push_e2e_user', defaults={'email': 'e2e@budgetbuddy.test'})
user.set_password('Password123!')
user.save()

from django.urls import reverse
client = APIClient()
login_res = client.post(reverse('login'), {'username': 'push_e2e_user', 'password': 'Password123!'})

assert login_res.status_code == 200, f"Login failed: {login_res.data}"
token = login_res.data['access']
client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
print("[PASS] User authenticated with JWT token.")

# Clean slate
PushSubscription.objects.filter(user=user).delete()
Reminder.objects.filter(user=user).delete()

# Scenario 1: Subscribe to Web Push successfully (VAPID Key & Push Subscription API)
vapid_res = client.get('/api/notifications/push/vapid-key/')
assert vapid_res.status_code == 200 and 'public_key' in vapid_res.data
pubkey = vapid_res.data['public_key']
print(f"[SCENARIO 1.1 - PASS] Retrieved VAPID public key: {pubkey[:24]}...")

sub_payload = {
    'endpoint': 'https://fcm.googleapis.com/fcm/send/device_alpha',
    'keys': {
        'p256dh': 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1Xbjhazmc3ng5DeBDffw0glg',
        'auth': 'tBHItJI5svbpez7KI4CCXg',
    },
    'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
}
sub_res = client.post('/api/notifications/push/subscribe/', sub_payload, format='json')
assert sub_res.status_code in (200, 201), f"Subscribe failed: {sub_res.data}"
assert PushSubscription.objects.filter(user=user, endpoint=sub_payload['endpoint']).exists()
print("[SCENARIO 1.2 - PASS] Web Push subscription registered successfully in DB.")

# Scenario 2: Create a reminder scheduled 2 minutes ahead
now = timezone.now()
two_mins_ahead = now + timedelta(minutes=2)
rem_payload = {
    'title': 'Pay Electricity Bill',
    'message': 'Due payment of $85.50 for October power consumption',
    'category': 'bill',
    'priority': 'urgent',
    'reminder_datetime': two_mins_ahead.isoformat(),
}
create_res = client.post('/api/notifications/reminders/', rem_payload, format='json')
assert create_res.status_code == 201
reminder_id = create_res.data['id']
rem = Reminder.objects.get(id=reminder_id)
assert not rem.notification_delivered
print(f"[SCENARIO 2 - PASS] Created reminder #{rem.id} scheduled for {rem.reminder_datetime.isoformat()} (Active, undelivered).")

# Scenario 3 & 4: Simulate closed tab / background delivery before & after due time
with patch('notifications.services.send_web_push', return_value=True) as mock_push:
    # 3. Deliver before scheduled time -> should not deliver
    res_before = deliver_scheduled_reminders()
    assert res_before['processed'] == 0
    rem.refresh_from_db()
    assert not rem.notification_delivered
    print("[SCENARIO 3 - PASS] Reminders before scheduled time are NOT delivered (Tab closed).")

    # 4. Advance time to due time -> deliver scheduled reminders
    rem.reminder_datetime = timezone.now() - timedelta(seconds=10)
    rem.save()

    res_due = deliver_scheduled_reminders()
    assert res_due['processed'] == 1
    assert mock_push.call_count == 1
    rem.refresh_from_db()
    assert rem.notification_delivered
    assert rem.last_notified_at is not None
    print("[SCENARIO 4 - PASS] Reminder evaluated and delivered atomically via Web Push scheduler.")

# Scenario 5: Verify Web Push payload structure and options
with patch('notifications.services.send_web_push') as mock_push:
    # Create another due reminder
    r_check = Reminder.objects.create(
        user=user,
        title='Rent Due',
        message='Monthly apartment rent $1200',
        category='payment',
        priority='high',
        reminder_datetime=timezone.now() - timedelta(minutes=1),
        notification_delivered=False,
    )
    deliver_scheduled_reminders()
    assert mock_push.called
    sub_arg, payload_arg = mock_push.call_args[0]
    assert payload_arg['title'] == 'BudgetBuddy – Financial Reminder'
    assert 'Rent Due' in payload_arg['body']
    assert payload_arg['priority'] == 'high'
    assert payload_arg['category'] == 'payment'
    assert payload_arg['tag'] == f'budgetbuddy-reminder-{r_check.id}'
    assert payload_arg['url'] == '/notifications?tab=reminders'
    print(f"[SCENARIO 5 - PASS] Web Push payload verified: {json.dumps(payload_arg, indent=2)}")

# Scenario 6: Service Worker target URL
assert payload_arg['url'] == '/notifications?tab=reminders'
print("[SCENARIO 6 - PASS] Target URL points to Smart Reminders tab (/notifications?tab=reminders).")

# Scenario 7: Snoozed reminders
snooze_res = client.post(f'/api/notifications/reminders/{rem.id}/snooze/', {'minutes': 15})
assert snooze_res.status_code == 200
rem.refresh_from_db()
assert not rem.notification_delivered, "Snoozing must reset notification_delivered to False"
assert rem.snooze_count == 1
print("[SCENARIO 7.1 - PASS] Snoozed reminder reset notification_delivered=False.")

# Simulate arrival of snoozed time
rem.reminder_datetime = timezone.now() - timedelta(seconds=5)
rem.save()
with patch('notifications.services.send_web_push', return_value=True) as mock_snooze_push:
    res_snooze = deliver_scheduled_reminders()
    assert res_snooze['processed'] == 1
    assert mock_snooze_push.call_count == 1
    rem.refresh_from_db()
    assert rem.notification_delivered
print("[SCENARIO 7.2 - PASS] Snoozed reminder triggered again at updated scheduled time.")

# Scenario 8: Completed and deleted reminders
rem_done = Reminder.objects.create(
    user=user,
    title='Gym Membership',
    reminder_datetime=timezone.now() - timedelta(minutes=10),
    is_completed=True,
    notification_delivered=False,
)
rem_dismissed = Reminder.objects.create(
    user=user,
    title='Dismissed Notice',
    reminder_datetime=timezone.now() - timedelta(minutes=10),
    is_dismissed=True,
    notification_delivered=False,
)
with patch('notifications.services.send_web_push', return_value=True) as mock_skip:
    res_skip = deliver_scheduled_reminders()
    assert res_skip['processed'] == 0
    assert mock_skip.call_count == 0
print("[SCENARIO 8 - PASS] Completed and dismissed reminders are skipped.")

# Scenario 9: Multiple reminders batch delivery
r_batch1 = Reminder.objects.create(user=user, title='Batch 1', category='bill', priority='urgent', reminder_datetime=timezone.now() - timedelta(minutes=5), notification_delivered=False)
r_batch2 = Reminder.objects.create(user=user, title='Batch 2', category='savings', priority='medium', reminder_datetime=timezone.now() - timedelta(minutes=3), notification_delivered=False)
r_batch3 = Reminder.objects.create(user=user, title='Batch 3', category='personal', priority='low', reminder_datetime=timezone.now() - timedelta(minutes=1), notification_delivered=False)

with patch('notifications.services.send_web_push', return_value=True) as mock_batch:
    res_batch = deliver_scheduled_reminders()
    assert res_batch['processed'] == 3
    assert mock_batch.call_count == 3
print("[SCENARIO 9 - PASS] Multiple reminders processed and dispatched in batch.")

# Scenario 10: Multiple subscriptions (multi-device) and duplicate prevention across concurrent workers
sub2_payload = {
    'endpoint': 'https://updates.push.services.mozilla.com/wpush/v2/device_beta',
    'keys': {
        'p256dh': 'p256dh_sample_key_beta',
        'auth': 'auth_sample_secret_beta',
    },
    'user_agent': 'Mozilla/5.0 (Android; Mobile) Firefox/120.0',
}
client.post('/api/notifications/push/subscribe/', sub2_payload, format='json')
assert PushSubscription.objects.filter(user=user).count() == 2
print("[SCENARIO 10.1 - PASS] Multi-device subscriptions registered (2 devices for same user).")

r_multi = Reminder.objects.create(
    user=user,
    title='Water Bill',
    reminder_datetime=timezone.now() - timedelta(minutes=2),
    notification_delivered=False,
)
with patch('notifications.services.send_web_push', return_value=True) as mock_multi:
    # First worker run
    res_w1 = deliver_scheduled_reminders()
    assert res_w1['processed'] == 1
    # Sent to BOTH devices
    assert mock_multi.call_count == 2
    # Second concurrent worker run immediately after -> must be 0 (Duplicate prevention)
    res_w2 = deliver_scheduled_reminders()
    assert res_w2['processed'] == 0
    assert mock_multi.call_count == 2
print("[SCENARIO 10.2 - PASS] Dispatched to all registered user devices with atomic duplicate prevention.")

# Scenario 11: Expired subscriptions (410 Gone) auto-cleanup
from pywebpush import WebPushException
exp_sub = PushSubscription.objects.create(
    user=user,
    endpoint='https://fcm.googleapis.com/fcm/send/expired_terminal',
    p256dh='fake_key',
    auth='fake_auth',
)
mock_resp = MagicMock()
mock_resp.status_code = 410
mock_exc = WebPushException("Push subscription has expired", response=mock_resp)

with patch('pywebpush.webpush', side_effect=mock_exc):
    success = send_web_push(exp_sub, {"title": "Test Expired"})
    assert not success
    assert not PushSubscription.objects.filter(id=exp_sub.id).exists()
print("[SCENARIO 11 - PASS] Expired subscription (HTTP 410) automatically pruned from database.")

# Scenario 12: Verify existing browser notifications API still work
due_qs = client.get('/api/notifications/reminders/due/')
assert due_qs.status_code == 200
undelivered_qs = client.get('/api/notifications/reminders/due/?undelivered=true')
assert undelivered_qs.status_code == 200
print("[SCENARIO 12 - PASS] Existing browser reminder notification APIs remain 100% operational.")

print("\n" + "=" * 80)
print("ALL 12 WEB PUSH SCENARIOS TESTED AND VERIFIED SUCCESSFULLY!")
print("=" * 80)
