from rest_framework import serializers
from .models import Notification, Reminder


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            'id',
            'title',
            'message',
            'notification_type',
            'is_read',
            'link',
            'created_at',
        )
        read_only_fields = ('id', 'created_at')


class ReminderSerializer(serializers.ModelSerializer):
    is_due = serializers.BooleanField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)

    class Meta:
        model = Reminder
        fields = (
            'id',
            'title',
            'message',
            'category',
            'priority',
            'reminder_datetime',
            'is_completed',
            'is_dismissed',
            'snooze_count',
            'is_due',
            'is_overdue',
            'is_upcoming',
            'created_at',
        )
        read_only_fields = ('id', 'is_completed', 'is_dismissed', 'snooze_count', 'is_due', 'is_overdue', 'is_upcoming', 'created_at')
