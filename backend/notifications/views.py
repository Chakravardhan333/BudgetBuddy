from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.utils import timezone
from .models import Notification, Reminder
from .serializers import NotificationSerializer, ReminderSerializer
from .services import trigger_user_notifications

class NotificationListView(APIView):
    """
    GET /api/notifications/
    Evaluates current financial triggers and returns all notifications for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        trigger_user_notifications(request.user)
        notifications = Notification.objects.filter(user=request.user)
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
            notification.save()
            return Response({"message": "Notification marked as read."}, status=status.HTTP_200_OK)
        except Notification.DoesNotExist:
            return Response({"error": "Notification not found."}, status=status.HTTP_404_NOT_FOUND)


class MarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    Marks all notifications for the authenticated user as read.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"message": "All notifications marked as read."}, status=status.HTTP_200_OK)


class UnreadCountView(APIView):
    """
    GET /api/notifications/unread-count/
    Returns total unread notifications for badge rendering.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"unread_count": count}, status=status.HTTP_200_OK)


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
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
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
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
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
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        due_reminders = Reminder.objects.filter(
            user=request.user,
            is_completed=False,
            is_dismissed=False,
            reminder_datetime__lte=timezone.now(),
        )
        serializer = ReminderSerializer(due_reminders, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
