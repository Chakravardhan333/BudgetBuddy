from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .models import Notification
from .serializers import NotificationSerializer
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
