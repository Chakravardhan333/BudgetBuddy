from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import UserProfile

class Command(BaseCommand):
    help = 'Seeds initial demonstration users for BudgetBuddy (Student, Premium, Admin)'

    def handle(self, *args, **options):
        users_to_seed = [
            {
                'username': 'demo_student',
                'email': 'student@budgetbuddy.app',
                'password': 'BudgetBuddy123!',
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
                'password': 'BudgetBuddy123!',
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
                'password': 'BudgetBuddyAdmin123!',
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
