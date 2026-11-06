from django.urls import path
from .views import (
    NotificationListView,
    MarkNotificationReadView,
    MarkAllReadView,
    UnreadCountView,
    ReminderListCreateView,
    ReminderDetailView,
    ReminderCompleteView,
    ReminderDismissView,
    ReminderSnoozeView,
    ReminderSummaryView,
    DueRemindersView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('unread-count/', UnreadCountView.as_view(), name='notification_unread_count'),
    path('<int:pk>/read/', MarkNotificationReadView.as_view(), name='notification_mark_read'),
    path('mark-all-read/', MarkAllReadView.as_view(), name='notification_mark_all_read'),
    # Reminder endpoints
    path('reminders/', ReminderListCreateView.as_view(), name='reminder_list_create'),
    path('reminders/due/', DueRemindersView.as_view(), name='reminder_due'),
    path('reminders/summary/', ReminderSummaryView.as_view(), name='reminder_summary'),
    path('reminders/<int:pk>/', ReminderDetailView.as_view(), name='reminder_detail'),
    path('reminders/<int:pk>/complete/', ReminderCompleteView.as_view(), name='reminder_complete'),
    path('reminders/<int:pk>/dismiss/', ReminderDismissView.as_view(), name='reminder_dismiss'),
    path('reminders/<int:pk>/snooze/', ReminderSnoozeView.as_view(), name='reminder_snooze'),
]
