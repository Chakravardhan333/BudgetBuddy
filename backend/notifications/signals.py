import logging

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from .delivery import send_notification_email
from .models import Notification

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Notification)
def email_new_notification(sender, instance, created, **kwargs):
    """Email new financial alerts without affecting in-app notification creation."""
    if not created or instance.category == "reminders":
        return

    def deliver():
        try:
            result = send_notification_email(instance)
            if not result.get("success"):
                logger.warning(
                    "BudgetBuddy notification email was not sent (notification_id=%s): %s",
                    instance.pk,
                    result.get("message", "unknown provider response"),
                )
        except Exception:
            logger.exception(
                "Unexpected notification email error (notification_id=%s)",
                instance.pk,
            )

    transaction.on_commit(deliver)
