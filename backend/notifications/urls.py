from django.urls import path
from .views import (
    NotificationListView,
    NotificationDetailView,
    MarkNotificationReadView,
    MarkAllReadView,
    ClearNotificationsView,
    UnreadCountView,
    ReminderListCreateView,
    ReminderDetailView,
    ReminderCompleteView,
    ReminderDismissView,
    ReminderSnoozeView,
    ReminderSummaryView,
    DueRemindersView,
    ReminderMarkDeliveredView,
    VapidPublicKeyView,
    PushSubscriptionView,
    PushUnsubscribeView,
    PushTestView,
    TriggerDeliverRemindersView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('unread-count/', UnreadCountView.as_view(), name='notification_unread_count'),
    path('mark-all-read/', MarkAllReadView.as_view(), name='notification_mark_all_read'),
    path('clear/', ClearNotificationsView.as_view(), name='notification_clear'),
    path('<int:pk>/', NotificationDetailView.as_view(), name='notification_detail'),
    path('<int:pk>/read/', MarkNotificationReadView.as_view(), name='notification_mark_read'),
    # Reminder endpoints

    path('reminders/', ReminderListCreateView.as_view(), name='reminder_list_create'),
    path('reminders/due/', DueRemindersView.as_view(), name='reminder_due'),
    path('reminders/summary/', ReminderSummaryView.as_view(), name='reminder_summary'),
    path('reminders/<int:pk>/', ReminderDetailView.as_view(), name='reminder_detail'),
    path('reminders/<int:pk>/complete/', ReminderCompleteView.as_view(), name='reminder_complete'),
    path('reminders/<int:pk>/dismiss/', ReminderDismissView.as_view(), name='reminder_dismiss'),
    path('reminders/<int:pk>/snooze/', ReminderSnoozeView.as_view(), name='reminder_snooze'),
    path('reminders/<int:pk>/delivered/', ReminderMarkDeliveredView.as_view(), name='reminder_mark_delivered'),
    path('reminders/<int:pk>/mark-delivered/', ReminderMarkDeliveredView.as_view(), name='reminder_mark_delivered_alt'),
    # Web Push endpoints
    path('push/vapid-key/', VapidPublicKeyView.as_view(), name='push_vapid_key'),
    path('push/subscribe/', PushSubscriptionView.as_view(), name='push_subscribe'),
    path('push/status/', PushSubscriptionView.as_view(), name='push_status'),
    path('push/unsubscribe/', PushUnsubscribeView.as_view(), name='push_unsubscribe'),
    path('push/test/', PushTestView.as_view(), name='push_test'),
    path('push/deliver-due/', TriggerDeliverRemindersView.as_view(), name='push_deliver_due'),
]

