from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from .models import Notification
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
                if not Notification.objects.filter(user=user, title=title, created_at__gte=recent_cutoff).exists():
                    Notification.objects.create(
                        user=user,
                        title=title,
                        message=f"You have spent {spending:.2f}, exceeding your {category_label} budget cap of {limit:.2f}.",
                        notification_type='alert',
                        link='/budgets',
                    )
            elif spending >= (limit * Decimal('0.80')):
                title = f"Budget Threshold Warning: {category_label}"
                if not Notification.objects.filter(user=user, title=title, created_at__gte=recent_cutoff).exists():
                    Notification.objects.create(
                        user=user,
                        title=title,
                        message=f"You have used {spending:.2f} (over 80%) of your {category_label} budget cap ({limit:.2f}).",
                        notification_type='warning',
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
            alert_type = 'warning'
            msg = f"Your {category_title.lower()} '{r.title}' is due now ({r.reminder_datetime.strftime('%b %d, %Y at %H:%M')})."

        # Deduplicate alerts within the last 24 hours per reminder
        recent_reminder_cutoff = now - timedelta(hours=24)
        if not Notification.objects.filter(user=user, title=alert_title, created_at__gte=recent_reminder_cutoff).exists():
            Notification.objects.create(
                user=user,
                title=alert_title,
                message=msg,
                notification_type=alert_type,
                link='/notifications',
            )
