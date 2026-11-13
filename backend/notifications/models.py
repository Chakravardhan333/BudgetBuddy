from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Notification(models.Model):
    TYPE_CHOICES = (
        ('warning', 'Warning'),
        ('info', 'Information'),
        ('success', 'Success'),
        ('alert', 'Alert'),
    )

    CATEGORY_CHOICES = (
        ('reminders', 'Reminders'),
        ('payments', 'Payments'),
        ('budgets', 'Budgets'),
        ('expenses', 'Expenses'),
        ('system', 'System Alerts'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='system')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    link = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title} [{self.category}] ({'Read' if self.is_read else 'Unread'})"



class Reminder(models.Model):
    CATEGORY_CHOICES = (
        ('payment', 'Payment Reminder'),
        ('bill', 'Bill Reminder'),
        ('savings', 'Savings Reminder'),
        ('personal', 'Personal Finance'),
        ('budget', 'Budget Reminder'),
        ('expense', 'Expense Reminder'),
        ('financial', 'Financial Activity'),
    )

    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reminders')
    title = models.CharField(max_length=200)
    message = models.TextField(blank=True, default='')
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='bill')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    reminder_datetime = models.DateTimeField()
    is_completed = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    snooze_count = models.PositiveIntegerField(default=0)
    notification_delivered = models.BooleanField(default=False)
    last_notified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['reminder_datetime']

    def __str__(self):
        status = 'Completed' if self.is_completed else ('Dismissed' if self.is_dismissed else 'Pending')
        return f"{self.user.username} - {self.title} ({status}, {self.priority})"

    @property
    def is_due(self):
        """Returns True if the reminder datetime has arrived/passed and it is still active."""
        return not self.is_completed and not self.is_dismissed and self.reminder_datetime <= timezone.now()

    @property
    def is_overdue(self):
        """Returns True if reminder is active and more than 1 hour overdue."""
        now = timezone.now()
        return not self.is_completed and not self.is_dismissed and (self.reminder_datetime + timezone.timedelta(hours=1)) <= now

    @property
    def is_upcoming(self):
        """Returns True if reminder is active and scheduled within the next 48 hours."""
        now = timezone.now()
        return not self.is_completed and not self.is_dismissed and now < self.reminder_datetime <= (now + timezone.timedelta(hours=48))


class PushSubscription(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='push_subscriptions')
    endpoint = models.CharField(max_length=700)
    p256dh = models.CharField(max_length=255)
    auth = models.CharField(max_length=255)
    user_agent = models.CharField(max_length=500, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['user', 'endpoint'], name='unique_user_push_subscription')
        ]

    def __str__(self):
        return f"{self.user.username} - PushSubscription ({self.endpoint[:30]}...)"

