from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from django.core.mail import send_mail
from .models import Notification
from .delivery import send_msg91_reminder_sms
from transactions.models import Budget, Expense, SavingsGoal

def trigger_user_notifications(user):
    """
    Evaluates real financial records and generates relevant threshold alerts
    and milestone notifications, automatically deduplicating repeated alerts.
    """
    now = timezone.now()
    current_year = now.year
    current_month = now.month
    recent_cutoff = now - timedelta(days=14)

    # 1. Budget Checks
    budgets = Budget.objects.filter(user=user, year=current_year, month=current_month)
    for b in budgets:
        expenses_qs = Expense.objects.filter(user=user, date__year=current_year, date__month=current_month)
        if b.category:
            expenses_qs = expenses_qs.filter(category_name__iexact=b.category)
        
        spending = expenses_qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        limit = b.monthly_limit
        category_label = b.category or "Overall Monthly"

        if limit > 0:
            if spending >= limit:
                title = f"Budget Exceeded: {category_label}"
                if not Notification.objects.filter(user=user, title=title, created_at__year=current_year, created_at__month=current_month).exists():
                    Notification.objects.create(
                        user=user,
                        title=title,
                        message=f"You have spent {spending:.2f}, exceeding your {category_label} budget cap of {limit:.2f}.",
                        notification_type='alert',
                        category='budgets',
                        link='/budgets',
                    )
            elif spending >= (limit * Decimal('0.80')):
                title = f"Budget Threshold Warning: {category_label}"
                if not Notification.objects.filter(user=user, title=title, created_at__year=current_year, created_at__month=current_month).exists():
                    Notification.objects.create(
                        user=user,
                        title=title,
                        message=f"You have used {spending:.2f} (over 80%) of your {category_label} budget cap ({limit:.2f}).",
                        notification_type='warning',
                        category='budgets',
                        link='/budgets',
                    )

    # 2. Savings Goals Milestone Checks
    goals = SavingsGoal.objects.filter(user=user)
    for g in goals:
        if g.target_amount > 0:
            pct = (g.current_amount / g.target_amount) * 100
            if pct >= 100:
                title = f"Savings Milestone Achieved: {g.title}"
                if not Notification.objects.filter(user=user, title=title).exists():
                    Notification.objects.create(
                        user=user,
                        title=title,
                        message=f"Congratulations! You have reached 100% of your target amount ({g.current_amount:.2f}) for '{g.title}'!",
                        notification_type='success',
                        category='payments',
                        link='/goals',
                    )
            elif pct >= 50:
                title = f"Halfway Milestone: {g.title}"
                if not Notification.objects.filter(user=user, title=title).exists():
                    Notification.objects.create(
                        user=user,
                        title=title,
                        message=f"Great job! You have reached 50% of your savings goal for '{g.title}' ({g.current_amount:.2f}/{g.target_amount:.2f}).",
                        notification_type='info',
                        category='payments',
                        link='/goals',
                    )

        # Approaching deadline check (due within 7 days and current < target)
        if g.target_date and g.current_amount < g.target_amount:
            days_left = (g.target_date - now.date()).days
            if 0 <= days_left <= 7:
                deadline_title = f"Savings Goal Deadline Approaching: {g.title}"
                if not Notification.objects.filter(user=user, title=deadline_title, created_at__gte=now - timedelta(days=3)).exists():
                    Notification.objects.create(
                        user=user,
                        title=deadline_title,
                        message=f"Your goal '{g.title}' is due in {days_left} day(s) on {g.target_date}. Current progress: {g.current_amount:.2f}/{g.target_amount:.2f}.",
                        notification_type='warning',
                        category='payments',
                        link='/goals',
                    )

    # 3. Due & Overdue Reminders Checks
    from .models import Reminder
    active_reminders = Reminder.objects.filter(
        user=user,
        is_completed=False,
        is_dismissed=False,
        reminder_datetime__lte=now,
    )
    for r in active_reminders:
        category_title = r.get_category_display()
        if r.is_overdue:
            alert_title = f"Overdue Alert: {r.title}"
            alert_type = 'alert'
            msg = f"Your {category_title.lower()} '{r.title}' was scheduled for {r.reminder_datetime.strftime('%b %d, %Y at %H:%M')} and is currently overdue."
        else:
            alert_title = f"Reminder Due: {r.title}"
            alert_type = 'alert' if r.priority in ('high', 'urgent') else 'warning'
            msg = f"Your {category_title.lower()} '{r.title}' is due now ({r.reminder_datetime.strftime('%b %d, %Y at %H:%M')})."

        # Deduplicate alerts: check if alert created on or after this reminder's scheduled datetime
        if not Notification.objects.filter(user=user, title=alert_title, created_at__gte=r.reminder_datetime).exists():
            Notification.objects.create(
                user=user,
                title=alert_title,
                message=msg,
                notification_type=alert_type,
                category='reminders',
                link='/notifications?tab=reminders',
            )

    # 4. High Expense Alerts
    recent_expenses = Expense.objects.filter(user=user, date__gte=now.date() - timedelta(days=7))
    for exp in recent_expenses:
        if exp.amount >= Decimal('100.00'):
            exp_title = f"High Expense Logged: {exp.category_name or 'General'}"
            if not Notification.objects.filter(user=user, title=exp_title, created_at__gte=recent_cutoff).exists():
                Notification.objects.create(
                    user=user,
                    title=exp_title,
                    message=f"You recorded an expense of {exp.amount:.2f} for '{exp.description or exp.category_name}'.",
                    notification_type='info',
                    category='expenses',
                    link='/expenses',
                )



# Web Push Notification Services
import json
import logging
from django.conf import settings
from django.db import transaction
from .models import PushSubscription

logger = logging.getLogger(__name__)


def send_web_push(subscription, payload):
    """
    Sends an encrypted Web Push notification payload to a single PushSubscription.
    Automatically removes subscriptions that return 404/410 (expired/unregistered).
    """
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        logger.error("pywebpush is not installed. Web Push cannot be delivered.")
        return False

    vapid_private_key = getattr(settings, 'VAPID_PRIVATE_KEY', None)
    vapid_admin_email = getattr(settings, 'VAPID_ADMIN_EMAIL', 'mailto:admin@budgetbuddy.local')

    if not vapid_private_key:
        logger.warning("VAPID_PRIVATE_KEY is not configured in settings. Skipping push delivery.")
        return False

    sub_info = {
        "endpoint": subscription.endpoint,
        "keys": {
            "p256dh": subscription.p256dh,
            "auth": subscription.auth,
        }
    }

    if isinstance(payload, dict):
        payload_data = json.dumps(payload)
    else:
        payload_data = str(payload)

    try:
        response = webpush(
            subscription_info=sub_info,
            data=payload_data,
            vapid_private_key=vapid_private_key,
            vapid_claims={"sub": vapid_admin_email},
            ttl=86400,
            timeout=10,
        )
        logger.info(f"Web push sent successfully to subscription {subscription.id} (user {subscription.user.username}).")
        return True
    except WebPushException as exc:
        status_code = getattr(exc.response, 'status_code', None) if exc.response is not None else None
        logger.warning(f"WebPushException for subscription {subscription.id}: {exc} (Status: {status_code})")
        # 404 Not Found or 410 Gone indicates the push service subscription has expired or was revoked
        if status_code in (404, 410):
            logger.info(f"Subscription {subscription.id} returned HTTP {status_code}. Removing expired subscription from database.")
            subscription.delete()
        return False
    except Exception as exc:
        logger.error(f"Unexpected error delivering web push to subscription {subscription.id}: {exc}")
        return False


def deliver_scheduled_reminders():
    """
    Deliver due reminders independently through Web Push, email, and opted-in SMS.
    Per-channel flags prevent successful channels from being resent when another
    channel fails and is retried by Celery.
    """
    import os
    from django.db.models import Q
    from .models import Reminder

    now = timezone.now()
    results = []
    smtp_ready = (
        getattr(settings, "EMAIL_BACKEND", "") == "django.core.mail.backends.smtp.EmailBackend"
        and bool(getattr(settings, "EMAIL_HOST", ""))
        and bool(getattr(settings, "EMAIL_HOST_USER", ""))
        and bool(getattr(settings, "EMAIL_HOST_PASSWORD", ""))
    )
    msg91_ready = bool(os.environ.get("MSG91_AUTH_KEY", "").strip() and os.environ.get("MSG91_TEMPLATE_ID", "").strip())

    # Restrict the queue to reminders with at least one enabled, unfinished
    # channel. This prevents older reminders with no enabled channel from
    # occupying the bounded batch and starving newer reminders.
    eligible = Q(pk__in=[])
    if smtp_ready:
        eligible |= Q(email_delivered=False, user__email__gt="")
    if msg91_ready:
        eligible |= Q(
            sms_delivered=False,
            user__profile__sms_notifications_enabled=True,
            user__profile__phone_number__gt="",
        )
    eligible |= Q(
        notification_delivered=False,
        user__push_subscriptions__isnull=False,
    )
    due_ids = list(Reminder.objects.filter(
        eligible,
        is_completed=False,
        is_dismissed=False,
        reminder_datetime__lte=now,
    ).order_by("reminder_datetime").values_list("id", flat=True).distinct()[:500])

    for reminder_id in due_ids:
        # Lock and claim only channels that are configured and eligible.
        with transaction.atomic():
            reminder = Reminder.objects.select_for_update().select_related("user", "user__profile").filter(pk=reminder_id).first()
            if not reminder or reminder.is_completed or reminder.is_dismissed:
                continue

            subs = list(PushSubscription.objects.filter(user=reminder.user))
            profile = getattr(reminder.user, "profile", None)
            email_due = smtp_ready and bool((reminder.user.email or "").strip()) and not reminder.email_delivered
            sms_due = (
                msg91_ready
                and bool(profile and profile.sms_notifications_enabled)
                and bool(profile.phone_number)
                and not reminder.sms_delivered
            )
            push_due = bool(subs) and not reminder.notification_delivered

            if not (email_due or sms_due or push_due):
                continue

            if email_due:
                reminder.email_delivered = True  # temporary claim; reset if provider fails
            if sms_due:
                reminder.sms_delivered = True
            if push_due:
                reminder.notification_delivered = True
            reminder.last_notified_at = now
            reminder.save(update_fields=[
                "email_delivered", "sms_delivered", "notification_delivered", "last_notified_at"
            ])

        title = f"Reminder Due: {reminder.title}"
        body_text = (reminder.message or f"Your reminder '{reminder.title}' is due.").strip()
        # Keep the in-app notification record independent from outbound delivery.
        if not Notification.objects.filter(
            user=reminder.user, title=title, created_at__gte=reminder.reminder_datetime
        ).exists():
            Notification.objects.create(
                user=reminder.user,
                title=title,
                message=body_text,
                notification_type="alert" if reminder.priority in ("high", "urgent") else "warning",
                category="reminders",
                link="/notifications?tab=reminders",
            )

        email_ok = False
        if email_due:
            try:
                email_ok = send_mail(
                    subject=f"BudgetBuddy reminder: {reminder.title}",
                    message=(
                        f"Your BudgetBuddy reminder is due.\\n\\n"
                        f"Reminder: {reminder.title}\\n"
                        f"Details: {body_text}\\n"
                        f"Scheduled: {timezone.localtime(reminder.reminder_datetime).strftime('%d %b %Y, %I:%M %p')}"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[reminder.user.email],
                    fail_silently=False,
                ) == 1
            except Exception:
                logger.exception("Reminder email delivery failed for reminder_id=%s", reminder.id)
            if not email_ok:
                Reminder.objects.filter(pk=reminder.pk).update(email_delivered=False)

        sms_ok = False
        if sms_due:
            sms_ok = send_msg91_reminder_sms(profile.phone_number, reminder.title, body_text)
            if not sms_ok:
                Reminder.objects.filter(pk=reminder.pk).update(sms_delivered=False)

        push_ok_count = 0
        if push_due:
            payload = {
                "title": "BudgetBuddy – Financial Reminder",
                "body": f"{reminder.title} – {body_text}",
                "id": reminder.id,
                "priority": reminder.priority,
                "category": reminder.category,
                "scheduled_time": reminder.reminder_datetime.isoformat(),
                "tag": f"budgetbuddy-reminder-{reminder.id}",
                "url": "/notifications?tab=reminders",
                "timestamp": int(reminder.reminder_datetime.timestamp() * 1000),
            }
            for sub in subs:
                if send_web_push(sub, payload):
                    push_ok_count += 1
            if push_ok_count == 0:
                Reminder.objects.filter(pk=reminder.pk).update(notification_delivered=False)

        results.append({
            "reminder_id": reminder.id,
            "email_sent": email_ok,
            "sms_sent": sms_ok,
            "push_delivered": push_ok_count,
            "push_subscriptions": len(subs),
        })

    logger.info("Processed %s due reminders across configured channels", len(results))
    return {"processed": len(results), "results": results}


def send_test_push(user):
    """
    Sends a test push notification to all active push subscriptions for a user.
    """
    subs = list(PushSubscription.objects.filter(user=user))
    if not subs:
        return {"success": False, "message": "No active push subscriptions found for this user."}

    payload = {
        "title": "BudgetBuddy – Test Push Notification",
        "body": "Web Push Notifications are working! You will receive alerts even when this tab is closed.",
        "id": 0,
        "priority": "medium",
        "category": "test",
        "scheduled_time": timezone.now().isoformat(),
        "tag": f"budgetbuddy-test-push-{user.id}",
        "url": "/notifications?tab=reminders",
        "timestamp": int(timezone.now().timestamp() * 1000),
    }

    delivered = 0
    for sub in subs:
        if send_web_push(sub, payload):
            delivered += 1

    return {
        "success": delivered > 0,
        "message": f"Sent test push to {delivered}/{len(subs)} subscription(s).",
        "delivered_count": delivered,
        "total_subscriptions": len(subs),
    }

