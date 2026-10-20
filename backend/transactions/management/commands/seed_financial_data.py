from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import date, timedelta
from transactions.models import Expense, Income, Budget, SavingsGoal, GoalContribution

class Command(BaseCommand):
    help = 'Seeds initial financial records (Expenses, Income, Budget, Goals) for demo_student'

    def handle(self, *args, **options):
        student = User.objects.filter(username='demo_student').first()
        if not student:
            self.stdout.write(self.style.ERROR("demo_student does not exist. Run seed_users first."))
            return

        today = date.today()

        # Seed Income
        incomes_data = [
            {'amount': Decimal('850.00'), 'source': 'scholarship', 'desc': 'Merit Academic Scholarship', 'days_ago': 18},
            {'amount': Decimal('420.00'), 'source': 'part_time', 'desc': 'Campus Library Assistant Tutoring', 'days_ago': 8},
            {'amount': Decimal('250.00'), 'source': 'freelance', 'desc': 'Web Design Bugfixes', 'days_ago': 2},
        ]

        for item in incomes_data:
            dt = today - timedelta(days=item['days_ago'])
            Income.objects.get_or_create(
                user=student,
                description=item['desc'],
                defaults={
                    'amount': item['amount'],
                    'source': item['source'],
                    'date': dt,
                }
            )

        # Seed Expenses
        expenses_data = [
            {'amount': Decimal('68.50'), 'category': 'Food & Dining', 'desc': 'Weekly Grocery Haul', 'method': 'card', 'days_ago': 14},
            {'amount': Decimal('45.00'), 'category': 'Travel & Commute', 'desc': 'Monthly City Metro Transit Pass', 'method': 'card', 'days_ago': 12},
            {'amount': Decimal('89.90'), 'category': 'Education & Books', 'desc': 'Data Structures & Algorithms Textbook', 'method': 'upi', 'days_ago': 9},
            {'amount': Decimal('32.40'), 'category': 'Entertainment', 'desc': 'Weekend Cinema & Snacks', 'method': 'cash', 'days_ago': 5},
            {'amount': Decimal('28.00'), 'category': 'Bills & Utilities', 'desc': 'Mobile High-Speed Data Plan', 'method': 'card', 'days_ago': 3},
            {'amount': Decimal('18.75'), 'category': 'Food & Dining', 'desc': 'Campus Cafe Lunch with Classmates', 'method': 'cash', 'days_ago': 1},
        ]

        for item in expenses_data:
            dt = today - timedelta(days=item['days_ago'])
            Expense.objects.get_or_create(
                user=student,
                description=item['desc'],
                defaults={
                    'amount': item['amount'],
                    'category_name': item['category'],
                    'payment_method': item['method'],
                    'date': dt,
                }
            )

        # Seed Monthly Budget
        Budget.objects.get_or_create(
            user=student,
            month=today.month,
            year=today.year,
            category=None,
            defaults={
                'monthly_limit': Decimal('650.00'),
                'warning_threshold': 80,
            }
        )

        # Seed Savings Goals
        goals_data = [
            {
                'title': 'New Study Laptop',
                'target': Decimal('1200.00'),
                'current': Decimal('800.00'),
                'target_date': today + timedelta(days=90),
            },
            {
                'title': 'Emergency Cushion',
                'target': Decimal('600.00'),
                'current': Decimal('450.00'),
                'target_date': today + timedelta(days=180),
            },
        ]

        for g in goals_data:
            goal, created = SavingsGoal.objects.get_or_create(
                user=student,
                title=g['title'],
                defaults={
                    'target_amount': g['target'],
                    'current_amount': g['current'],
                    'target_date': g['target_date'],
                    'status': 'in_progress',
                }
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded real demonstration financial records for demo_student."))
