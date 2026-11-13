from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.utils import timezone
from .models import Notification, Reminder, PushSubscription
from .serializers import NotificationSerializer, ReminderSerializer, PushSubscriptionSerializer
from .services import trigger_user_notifications, send_test_push, deliver_scheduled_reminders


class NotificationListView(APIView):
    """
    GET  /api/notifications/  → Evaluates triggers & returns notifications for user.
                                Supports ?category=, ?is_read=, ?search=
    POST /api/notifications/  → Create custom/manual notification for user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trigger_user_notifications(request.user)
        qs = Notification.objects.filter(user=request.user)

        category = request.query_params.get('category')
        if category and category != 'all':
            qs = qs.filter(category=category.lower())

        is_read = request.query_params.get('is_read')
        if is_read is not None:
            if is_read.lower() in ('true', '1'):
                qs = qs.filter(is_read=True)
            elif is_read.lower() in ('false', '0'):
                qs = qs.filter(is_read=False)

        search = request.query_params.get('search')
        if search:
            from django.db.models import Q
            qs = qs.filter(Q(title__icontains=search) | Q(message__icontains=search))

        serializer = NotificationSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = NotificationSerializer(data=request.data)
        if serializer.is_valid():
            notif = serializer.save(user=request.user)
            return Response(NotificationSerializer(notif).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class NotificationDetailView(APIView):
    """
    GET    /api/notifications/<id>/  → Retrieve single notification.
    PATCH  /api/notifications/<id>/  → Update notification (e.g. is_read, category).
    DELETE /api/notifications/<id>/  → Delete individual notification.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            return Response(NotificationSerializer(notification).data, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            serializer = NotificationSerializer(notification, data=request.data, partial=True)
            if serializer.is_valid():
                if 'is_read' in serializer.validated_data and serializer.validated_data['is_read'] and not notification.read_at:
                    notification.read_at = timezone.now()
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.delete()
            return Response({"message": "Notification deleted successfully.", "id": pk}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)


class MarkNotificationReadView(APIView):
    """
    POST /api/notifications/<id>/read/
    Marks a specific notification as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(pk=pk, user=request.user)
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=['is_read', 'read_at'])
            return Response({
                "message": "Notification marked as read.",
                "id": notification.id,
                "is_read": True,
                "read_at": notification.read_at.isoformat()
            }, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)


class MarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    Marks all notifications for the authenticated user as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        category = request.data.get('category') or request.query_params.get('category')
        qs = Notification.objects.filter(user=request.user, is_read=False)
        if category and category != 'all':
            qs = qs.filter(category=category.lower())
        updated_count = qs.update(is_read=True, read_at=timezone.now())
        return Response({
            "message": "All notifications marked as read.",
            "updated_count": updated_count,
        }, status=status.HTTP_200_OK)


class ClearNotificationsView(APIView):
    """
    POST /api/notifications/clear/
    DELETE /api/notifications/clear/
    Clears read notifications (or all if ?all=true) for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        return self._clear(request)

    def delete(self, request):
        return self._clear(request)

    def _clear(self, request):
        clear_all = request.data.get('all') or request.query_params.get('all') in ('true', '1')
        category = request.data.get('category') or request.query_params.get('category')
        qs = Notification.objects.filter(user=request.user)
        if category and category != 'all':
            qs = qs.filter(category=category.lower())
        if not clear_all:
            qs = qs.filter(is_read=True)
        deleted_count, _ = qs.delete()
        return Response({
            "message": f"Cleared {deleted_count} notification(s).",
            "deleted_count": deleted_count,
        }, status=status.HTTP_200_OK)


class UnreadCountView(APIView):
    """
    GET /api/notifications/unread-count/
    Returns total unread notifications and category breakdown for badge rendering.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trigger_user_notifications(request.user)
        base_qs = Notification.objects.filter(user=request.user, is_read=False)
        total_count = base_qs.count()
        categories = {
            "reminders": base_qs.filter(category='reminders').count(),
            "payments": base_qs.filter(category='payments').count(),
            "budgets": base_qs.filter(category='budgets').count(),
            "expenses": base_qs.filter(category='expenses').count(),
            "system": base_qs.filter(category='system').count(),
        }
        return Response({
            "unread_count": total_count,
            "categories": categories,
        }, status=status.HTTP_200_OK)



# --------------- Reminder Views ---------------

class ReminderListCreateView(APIView):
    """
    GET  /api/notifications/reminders/        → List all reminders for the authenticated user.
    POST /api/notifications/reminders/        → Create a new reminder.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        reminders = Reminder.objects.filter(user=request.user)
        serializer = ReminderSerializer(reminders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = ReminderSerializer(data=request.data)
        if serializer.is_valid():
            reminder = serializer.save(user=request.user)
            return Response(ReminderSerializer(reminder).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ReminderDetailView(APIView):
    """
    GET    /api/notifications/reminders/<id>/  → Retrieve a single reminder.
    PUT    /api/notifications/reminders/<id>/  → Update a reminder.
    DELETE /api/notifications/reminders/<id>/  → Delete a reminder.
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_reminder(self, pk, user):
        try:
            return Reminder.objects.get(pk=pk, user=user)
        except Reminder.DoesNotExist:
            return None

    def get(self, request, pk):
        reminder = self._get_reminder(pk, request.user)
        if not reminder:
            return Response({"error": "Reminder not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ReminderSerializer(reminder)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        reminder = self._get_reminder(pk, request.user)
        if not reminder:
            return Response({"error": "Reminder not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ReminderSerializer(reminder, data=request.data, partial=True)
        if serializer.is_valid():
            old_datetime = reminder.reminder_datetime
            updated = serializer.save()
            if 'reminder_datetime' in request.data and updated.reminder_datetime != old_datetime:
                updated.notification_delivered = False
                updated.save(update_fields=['notification_delivered'])
            return Response(ReminderSerializer(updated).data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        return self.put(request, pk)

    def delete(self, request, pk):
        reminder = self._get_reminder(pk, request.user)
        if not reminder:
            return Response({"error": "Reminder not found."}, status=status.HTTP_404_NOT_FOUND)
        reminder.delete()
        return Response({"message": "Reminder deleted."}, status=status.HTTP_200_OK)


class ReminderCompleteView(APIView):
    """
    POST /api/notifications/reminders/<id>/complete/
    Marks a reminder as completed.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reminder = Reminder.objects.get(pk=pk, user=request.user)
            reminder.is_completed = True
            reminder.save()
            return Response({"message": "Reminder marked as completed."}, status=status.HTTP_200_OK)
        except Reminder.DoesNotExist:
            return Response({"error": "Reminder not found."}, status=status.HTTP_404_NOT_FOUND)


class ReminderDismissView(APIView):
    """
    POST /api/notifications/reminders/<id>/dismiss/
    Dismisses a reminder.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reminder = Reminder.objects.get(pk=pk, user=request.user)
            reminder.is_dismissed = True
            reminder.save()
            return Response({"message": "Reminder dismissed."}, status=status.HTTP_200_OK)
        except Reminder.DoesNotExist:
            return Response({"error": "Reminder not found."}, status=status.HTTP_404_NOT_FOUND)


class ReminderSnoozeView(APIView):
    """
    POST /api/notifications/reminders/<id>/snooze/
    Snoozes a reminder by a duration (minutes, hours, days) or until a custom datetime.
    Payload options:
    - { "minutes": 15 }
    - { "hours": 1 }
    - { "days": 1 }
    - { "snooze_until": "2026-11-07T10:00:00Z" }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reminder = Reminder.objects.get(pk=pk, user=request.user)
        except Reminder.DoesNotExist:
            return Response({"error": "Reminder not found."}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        base_time = max(reminder.reminder_datetime, now)

        minutes = request.data.get('minutes')
        hours = request.data.get('hours')
        days = request.data.get('days')
        snooze_until = request.data.get('snooze_until')

        if snooze_until:
            from django.utils.dateparse import parse_datetime
            parsed = parse_datetime(snooze_until)
            if not parsed:
                return Response({"error": "Invalid snooze_until datetime format."}, status=status.HTTP_400_BAD_REQUEST)
            if timezone.is_naive(parsed):
                parsed = timezone.make_aware(parsed)
            new_datetime = parsed
        elif days:
            new_datetime = base_time + timezone.timedelta(days=int(days))
        elif hours:
            new_datetime = base_time + timezone.timedelta(hours=int(hours))
        elif minutes:
            new_datetime = base_time + timezone.timedelta(minutes=int(minutes))
        else:
            # Default snooze: 1 hour
            new_datetime = base_time + timezone.timedelta(hours=1)

        reminder.reminder_datetime = new_datetime
        reminder.is_completed = False
        reminder.is_dismissed = False
        reminder.snooze_count += 1
        reminder.notification_delivered = False
        reminder.save()

        serializer = ReminderSerializer(reminder)
        return Response({
            "message": f"Reminder snoozed until {new_datetime.strftime('%b %d, %Y at %H:%M')}.",
            "reminder": serializer.data
        }, status=status.HTTP_200_OK)


class ReminderSummaryView(APIView):
    """
    GET /api/notifications/reminders/summary/
    Returns statistics and counts for smart reminders.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        qs = Reminder.objects.filter(user=request.user)
        active_qs = qs.filter(is_completed=False, is_dismissed=False)

        summary = {
            "total": qs.count(),
            "active": active_qs.count(),
            "due": active_qs.filter(reminder_datetime__lte=now).count(),
            "overdue": active_qs.filter(reminder_datetime__lte=now - timezone.timedelta(hours=1)).count(),
            "upcoming": active_qs.filter(reminder_datetime__gt=now, reminder_datetime__lte=now + timezone.timedelta(hours=48)).count(),
            "completed": qs.filter(is_completed=True).count(),
            "dismissed": qs.filter(is_dismissed=True).count(),
        }
        return Response(summary, status=status.HTTP_200_OK)


class DueRemindersView(APIView):
    """
    GET /api/notifications/reminders/due/
    Returns all active reminders whose reminder_datetime has passed (i.e. they are due now).
    Supports optional ?undelivered=true or ?undelivered_only=true parameter.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Reminder.objects.filter(
            user=request.user,
            is_completed=False,
            is_dismissed=False,
            reminder_datetime__lte=timezone.now(),
        )
        undelivered = request.query_params.get('undelivered') or request.query_params.get('undelivered_only')
        if undelivered in ['true', '1', 'True']:
            qs = qs.filter(notification_delivered=False)
        serializer = ReminderSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ReminderMarkDeliveredView(APIView):
    """
    POST /api/notifications/reminders/<id>/delivered/
    POST /api/notifications/reminders/<id>/mark-delivered/
    Marks a reminder as desktop/browser notification delivered.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            reminder = Reminder.objects.get(pk=pk, user=request.user)
            reminder.notification_delivered = True
            reminder.last_notified_at = timezone.now()
            reminder.save(update_fields=['notification_delivered', 'last_notified_at'])
            return Response({
                "message": "Reminder marked as notification delivered.",
                "id": reminder.id,
                "notification_delivered": reminder.notification_delivered,
                "last_notified_at": reminder.last_notified_at.isoformat(),
            }, status=status.HTTP_200_OK)
        except Reminder.DoesNotExist:
            return Response({"error": "Reminder not found."}, status=status.HTTP_404_NOT_FOUND)


# Web Push Views
class VapidPublicKeyView(APIView):
    """
    GET /api/notifications/push/vapid-key/
    Returns the VAPID public key needed for browser PushManager.subscribe().
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        public_key = getattr(settings, 'VAPID_PUBLIC_KEY', '')
        return Response({"public_key": public_key}, status=status.HTTP_200_OK)


class PushSubscriptionView(APIView):
    """
    GET /api/notifications/push/subscribe/ or /api/notifications/push/status/
    POST /api/notifications/push/subscribe/
    DELETE /api/notifications/push/subscribe/
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        subs = PushSubscription.objects.filter(user=request.user)
        serializer = PushSubscriptionSerializer(subs, many=True)
        return Response({
            "is_subscribed": subs.exists(),
            "count": subs.count(),
            "subscriptions": serializer.data,
        }, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = PushSubscriptionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        endpoint = serializer.validated_data['endpoint']
        p256dh = serializer.validated_data['p256dh']
        auth = serializer.validated_data['auth']
        user_agent = serializer.validated_data.get('user_agent') or request.META.get('HTTP_USER_AGENT', '')
        user_agent = user_agent[:500]

        sub, created = PushSubscription.objects.update_or_create(
            user=request.user,
            endpoint=endpoint,
            defaults={
                'p256dh': p256dh,
                'auth': auth,
                'user_agent': user_agent,
            }
        )

        return Response({
            "message": "Subscribed to Web Push notifications successfully.",
            "created": created,
            "subscription": PushSubscriptionSerializer(sub).data,
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request):
        endpoint = request.data.get('endpoint') or request.query_params.get('endpoint')
        if endpoint:
            deleted_count, _ = PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        else:
            deleted_count, _ = PushSubscription.objects.filter(user=request.user).delete()

        return Response({
            "message": f"Unsubscribed successfully ({deleted_count} subscription(s) removed).",
            "deleted_count": deleted_count,
        }, status=status.HTTP_200_OK)


class PushUnsubscribeView(APIView):
    """
    POST /api/notifications/push/unsubscribe/
    Convenience POST endpoint for unsubscription.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        endpoint = request.data.get('endpoint')
        if endpoint:
            deleted_count, _ = PushSubscription.objects.filter(user=request.user, endpoint=endpoint).delete()
        else:
            deleted_count, _ = PushSubscription.objects.filter(user=request.user).delete()

        return Response({
            "message": f"Unsubscribed successfully ({deleted_count} subscription(s) removed).",
            "deleted_count": deleted_count,
        }, status=status.HTTP_200_OK)


class PushTestView(APIView):
    """
    POST /api/notifications/push/test/
    Dispatches a test push notification to user's registered devices.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        result = send_test_push(request.user)
        status_code = status.HTTP_200_OK if result.get('success') else status.HTTP_400_BAD_REQUEST
        return Response(result, status=status_code)


class TriggerDeliverRemindersView(APIView):
    """
    POST /api/notifications/push/deliver-due/
    Manually triggers the global scheduled-reminder dispatcher.
    Restricted to administrators because it processes reminders for all users.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        res = deliver_scheduled_reminders()
        return Response(res, status=status.HTTP_200_OK)

