from rest_framework import serializers
from .models import Notification, Reminder, PushSubscription


class NotificationSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    type_display = serializers.CharField(source='get_notification_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = (
            'id',
            'title',
            'message',
            'notification_type',
            'type_display',
            'category',
            'category_display',
            'is_read',
            'read_at',
            'link',
            'created_at',
        )
        read_only_fields = ('id', 'created_at', 'category_display', 'type_display')



class ReminderSerializer(serializers.ModelSerializer):
    message = serializers.CharField(required=False, allow_blank=True, default='')
    description = serializers.CharField(source='message', required=False, allow_blank=True)
    is_due = serializers.BooleanField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)

    CATEGORY_NORMALIZATION_MAP = {
        'bill': 'bill',
        'bill reminder': 'bill',
        'bill payment': 'bill',
        'bills': 'bill',
        'payment': 'payment',
        'payment reminder': 'payment',
        'payments': 'payment',
        'savings': 'savings',
        'savings reminder': 'savings',
        'saving': 'savings',
        'personal': 'personal',
        'personal finance': 'personal',
        'budget': 'budget',
        'budget reminder': 'budget',
        'budgets': 'budget',
        'expense': 'expense',
        'expense reminder': 'expense',
        'expenses': 'expense',
        'financial': 'financial',
        'financial activity': 'financial',
        'finance': 'financial',
    }

    PRIORITY_NORMALIZATION_MAP = {
        'low': 'low',
        'medium': 'medium',
        'normal': 'medium',
        'high': 'high',
        'urgent': 'urgent',
        'critical': 'urgent',
    }

    class Meta:
        model = Reminder
        fields = (
            'id',
            'title',
            'message',
            'description',
            'category',
            'priority',
            'reminder_datetime',
            'is_completed',
            'is_dismissed',
            'snooze_count',
            'notification_delivered',
            'last_notified_at',
            'is_due',
            'is_overdue',
            'is_upcoming',
            'created_at',
        )
        read_only_fields = ('id', 'is_completed', 'is_dismissed', 'snooze_count', 'notification_delivered', 'last_notified_at', 'is_due', 'is_overdue', 'is_upcoming', 'created_at')

    def to_internal_value(self, data):
        # Work on a mutable copy
        if hasattr(data, 'copy'):
            normalized = data.copy()
        elif isinstance(data, dict):
            normalized = dict(data)
        else:
            normalized = data

        # 1. Map note / notes / description -> message if message is missing
        if 'note' in normalized and not normalized.get('message'):
            normalized['message'] = normalized['note']
        elif 'notes' in normalized and not normalized.get('message'):
            normalized['message'] = normalized['notes']
        elif 'description' in normalized and not normalized.get('message'):
            normalized['message'] = normalized['description']

        # Ensure description is synchronized with message for validation
        if 'message' in normalized and 'description' not in normalized:
            normalized['description'] = normalized['message']

        # 2. Normalize category (handle 'Bill Reminder', 'Payment Reminder', etc.)
        if 'category' in normalized and isinstance(normalized['category'], str):
            cat_clean = normalized['category'].strip().lower()
            normalized['category'] = self.CATEGORY_NORMALIZATION_MAP.get(cat_clean, cat_clean)

        # 3. Normalize priority (handle 'Urgent', 'High', etc.)
        if 'priority' in normalized and isinstance(normalized['priority'], str):
            pri_clean = normalized['priority'].strip().lower()
            normalized['priority'] = self.PRIORITY_NORMALIZATION_MAP.get(pri_clean, pri_clean)

        # 4. Map date / reminder_date -> reminder_datetime if missing
        if 'reminder_datetime' not in normalized or not normalized.get('reminder_datetime'):
            if normalized.get('date'):
                normalized['reminder_datetime'] = normalized['date']
            elif normalized.get('reminder_date'):
                normalized['reminder_datetime'] = normalized['reminder_date']

        return super().to_internal_value(normalized)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Ensure description field is always present matching message
        data['description'] = instance.message or ''
        data['category_display'] = instance.get_category_display()
        data['priority_display'] = instance.get_priority_display()
        return data


class PushSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PushSubscription
        fields = ('id', 'endpoint', 'p256dh', 'auth', 'user_agent', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

    def to_internal_value(self, data):
        if hasattr(data, 'copy'):
            normalized = data.copy()
        elif isinstance(data, dict):
            normalized = dict(data)
        else:
            normalized = data

        # Handle browser PushSubscription format: { endpoint, keys: { p256dh, auth } }
        keys = normalized.get('keys')
        if isinstance(keys, dict):
            if 'p256dh' in keys and 'p256dh' not in normalized:
                normalized['p256dh'] = keys['p256dh']
            if 'auth' in keys and 'auth' not in normalized:
                normalized['auth'] = keys['auth']

        return super().to_internal_value(normalized)

