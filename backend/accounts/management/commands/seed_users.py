import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.conf import settings
from accounts.models import UserProfile

class Command(BaseCommand):
    help = 'Seeds initial demonstration users for BudgetBuddy (Student, Premium, Admin)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Explicitly force seeding demo accounts even in non-DEBUG environments.',
        )

    def handle(self, *args, **options):
        # Prevent accidental creation of predictable demo accounts in production unless explicitly authorized
        is_debug = getattr(settings, 'DEBUG', False)
        is_env_enabled = os.environ.get('SEED_DEMO_DATA', '').lower() in ('true', '1')
        is_forced = options.get('force', False)

        if not is_debug and not is_env_enabled and not is_forced:
            self.stdout.write(self.style.WARNING(
                "Refusing to seed predictable demo accounts in production (DEBUG=False). "
                "To enable seeding explicitly, pass --force or set SEED_DEMO_DATA=True."
            ))
            return

        student_pwd = os.environ.get('DEMO_STUDENT_PASSWORD', 'BudgetBuddy123!')
        premium_pwd = os.environ.get('DEMO_PREMIUM_PASSWORD', 'BudgetBuddy123!')
        admin_pwd = os.environ.get('DEMO_ADMIN_PASSWORD', 'BudgetBuddyAdmin123!')

        users_to_seed = [
            {
                'username': 'demo_student',
                'email': 'student@budgetbuddy.app',
                'password': student_pwd,
                'first_name': 'Alex',
                'last_name': 'Student',
                'role': 'student',
                'currency': 'USD',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'demo_premium',
                'email': 'premium@budgetbuddy.app',
                'password': premium_pwd,
                'first_name': 'Sarah',
                'last_name': 'Investor',
                'role': 'premium',
                'currency': 'USD',
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'admin',
                'email': 'admin@budgetbuddy.app',
                'password': admin_pwd,
                'first_name': 'System',
                'last_name': 'Administrator',
                'role': 'admin',
                'currency': 'USD',
                'is_staff': True,
                'is_superuser': True,
            },
        ]

        for u in users_to_seed:
            user, created = User.objects.get_or_create(
                username=u['username'],
                defaults={
                    'email': u['email'],
                    'first_name': u['first_name'],
                    'last_name': u['last_name'],
                    'is_staff': u['is_staff'],
                    'is_superuser': u['is_superuser'],
                }
            )
            user.set_password(u['password'])
            user.is_staff = u['is_staff']
            user.is_superuser = u['is_superuser']
            user.save()

            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = u['role']
            profile.currency = u['currency']
            profile.save()

            action = 'Created' if created else 'Updated'
            self.stdout.write(self.style.SUCCESS(f"{action} user: {u['username']} ({u['role']})"))
