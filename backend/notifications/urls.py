from django.urls import path
from .views import (
    NotificationListView,
    MarkNotificationReadView,
    MarkAllReadView,
    UnreadCountView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('unread-count/', UnreadCountView.as_view(), name='notification_unread_count'),
    path('<int:pk>/read/', MarkNotificationReadView.as_view(), name='notification_mark_read'),
    path('mark-all-read/', MarkAllReadView.as_view(), name='notification_mark_all_read'),
]
