import logging
from celery import shared_task
from .services import deliver_scheduled_reminders

logger = logging.getLogger(__name__)


@shared_task(name='notifications.tasks.deliver_due_reminders_task')
def deliver_due_reminders_task():
    """
    Celery periodic task that evaluates scheduled financial reminders and delivers Web Push notifications.
    """
    try:
        results = deliver_scheduled_reminders()
        return results
    except Exception as exc:
        logger.error(f"Error executing deliver_due_reminders_task: {exc}")
        raise

