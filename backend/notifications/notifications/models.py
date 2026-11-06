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

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='info')
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=200, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.title} ({'Read' if self.is_read else 'Unread'})"


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
