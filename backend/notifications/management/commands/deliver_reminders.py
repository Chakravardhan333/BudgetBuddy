import time
from django.core.management.base import BaseCommand
from notifications.services import deliver_scheduled_reminders


class Command(BaseCommand):
    help = 'Evaluates scheduled financial reminders and delivers Web Push notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--loop',
            action='store_true',
            help='Run continuously in a loop',
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=30,
            help='Polling interval in seconds when running in loop mode (default: 30)',
        )

    def handle(self, *args, **options):
        is_loop = options.get('loop', False)
        interval = options.get('interval', 30)

        if not is_loop:
            self.stdout.write(self.style.NOTICE("Checking due reminders for Web Push delivery..."))
            res = deliver_scheduled_reminders()
            self.stdout.write(self.style.SUCCESS(f"Processed: {res['processed']} reminder(s)."))
            return

        self.stdout.write(self.style.SUCCESS(f"Starting BudgetBuddy Web Push reminder delivery daemon (interval: {interval}s)..."))
        try:
            while True:
                res = deliver_scheduled_reminders()
                if res['processed'] > 0:
                    self.stdout.write(self.style.SUCCESS(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] Delivered {res['processed']} reminder(s): {res['results']}"))
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.NOTICE("\nStopping Web Push reminder delivery daemon."))
