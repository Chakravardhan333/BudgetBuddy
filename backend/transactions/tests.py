from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date
from .models import Expense, Income, Budget, SavingsGoal, GoalContribution

class TransactionsModuleTests(TestCase):
    def setUp(self):
        self.client_a = APIClient()
        self.client_b = APIClient()

        # User A
        self.user_a = User.objects.create_user(
            username='user_a', email='a@budgetbuddy.test', password='Password123!'
        )
        login_res_a = self.client_a.post(reverse('login'), {'username': 'user_a', 'password': 'Password123!'})
        self.token_a = login_res_a.data['access']
        self.client_a.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_a}')

        # User B
        self.user_b = User.objects.create_user(
            username='user_b', email='b@budgetbuddy.test', password='Password123!'
        )
        login_res_b = self.client_b.post(reverse('login'), {'username': 'user_b', 'password': 'Password123!'})
        self.token_b = login_res_b.data['access']
        self.client_b.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token_b}')

        self.expenses_url = reverse('expense-list')
        self.income_url = reverse('income-list')
        self.budget_url = reverse('budget-list')
        self.goals_url = reverse('savings_goal-list')
        self.summary_url = reverse('dashboard_summary')

    def test_expense_crud_and_user_isolation(self):
        # User A creates an expense
        payload_a = {
            'amount': '45.50',
            'category_name': 'Food & Dining',
            'date': '2026-10-15',
            'description': 'Grocery Shopping',
            'payment_method': 'card',
        }
        res_create = self.client_a.post(self.expenses_url, payload_a, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        expense_id = res_create.data['id']

        # User A lists expenses -> should see 1 record
        res_list_a = self.client_a.get(self.expenses_url)
        self.assertEqual(len(res_list_a.data), 1)
        self.assertEqual(res_list_a.data[0]['description'], 'Grocery Shopping')

        # User B lists expenses -> should see 0 records (Strict Isolation)
        res_list_b = self.client_b.get(self.expenses_url)
        self.assertEqual(len(res_list_b.data), 0)

        # User B attempts to access User A's expense directly -> should return 404
        detail_url = reverse('expense-detail', kwargs={'pk': expense_id})
        res_direct = self.client_b.get(detail_url)
        self.assertEqual(res_direct.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_negative_amount_rejected(self):
        invalid_payload = {
            'amount': '-10.00',
            'category_name': 'Miscellaneous',
            'date': '2026-10-15',
            'description': 'Invalid test',
        }
        res = self.client_a.post(self.expenses_url, invalid_payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', res.data)

    def test_income_crud_and_summary_calculation(self):
        # Create Income
        inc_payload = {
            'amount': '1500.00',
            'source': 'freelance',
            'date': date.today().isoformat(),
            'description': 'Web Design Project',
        }
        res_inc = self.client_a.post(self.income_url, inc_payload, format='json')
        self.assertEqual(res_inc.status_code, status.HTTP_201_CREATED)

        # Create Expense
        exp_payload = {
            'amount': '300.00',
            'category_name': 'Bills & Utilities',
            'date': date.today().isoformat(),
            'description': 'Electricity bill',
        }
        self.client_a.post(self.expenses_url, exp_payload, format='json')

        # Check Dashboard Summary
        res_summary = self.client_a.get(self.summary_url)
        self.assertEqual(res_summary.status_code, status.HTTP_200_OK)
        data = res_summary.data
        self.assertEqual(data['monthly_income'], 1500.00)
        self.assertEqual(data['monthly_expenses'], 300.00)
        self.assertEqual(data['balance'], 1200.00)
        self.assertEqual(len(data['recent_transactions']), 2)

    def test_budget_utilization_calculation(self):
        today = date.today()
        # Set budget limit for current month
        budget_payload = {
            'month': today.month,
            'year': today.year,
            'monthly_limit': '500.00',
        }
        res_b = self.client_a.post(self.budget_url, budget_payload, format='json')
        self.assertEqual(res_b.status_code, status.HTTP_201_CREATED)

        # Add expense of 250 (50% utilization)
        self.client_a.post(self.expenses_url, {
            'amount': '250.00',
            'category_name': 'Education',
            'date': today.isoformat(),
            'description': 'Textbooks',
        }, format='json')

        # Retrieve budget
        b_list = self.client_a.get(self.budget_url)
        b_data = b_list.data[0]
        self.assertEqual(b_data['actual_spending'], 250.00)
        self.assertEqual(b_data['remaining_budget'], 250.00)
        self.assertEqual(b_data['utilization_percentage'], 50.0)

    def test_savings_goal_and_contribution(self):
        # Create Goal
        goal_payload = {
            'title': 'Emergency Fund',
            'target_amount': '1000.00',
            'target_date': '2026-12-31',
        }
        res_g = self.client_a.post(self.goals_url, goal_payload, format='json')
        self.assertEqual(res_g.status_code, status.HTTP_201_CREATED)
        goal_id = res_g.data['id']

        # Contribute 500
        contribute_url = reverse('savings_goal-contribute', kwargs={'pk': goal_id})
        res_c = self.client_a.post(contribute_url, {'amount': '500.00'}, format='json')
        self.assertEqual(res_c.status_code, status.HTTP_201_CREATED)

        # Verify goal updated
        goal_detail = self.client_a.get(reverse('savings_goal-detail', kwargs={'pk': goal_id}))
        self.assertEqual(float(goal_detail.data['current_amount']), 500.00)
        self.assertEqual(goal_detail.data['progress_percentage'], 50.0)
        self.assertEqual(goal_detail.data['status'], 'in_progress')

        # Contribute another 500 (reaches 1000 -> status changes to completed)
        self.client_a.post(contribute_url, {'amount': '500.00'}, format='json')
        goal_completed = self.client_a.get(reverse('savings_goal-detail', kwargs={'pk': goal_id}))
        self.assertEqual(float(goal_completed.data['current_amount']), 1000.00)
        self.assertEqual(goal_completed.data['status'], 'completed')

    def test_date_range_filtering(self):
        # Create expenses across different dates
        self.client_a.post(self.expenses_url, {
            'amount': '50.00', 'category_name': 'Food & Dining', 'date': '2026-05-10', 'description': 'Past expense'
        }, format='json')
        self.client_a.post(self.expenses_url, {
            'amount': '80.00', 'category_name': 'Travel', 'date': '2026-06-15', 'description': 'Mid expense'
        }, format='json')
        self.client_a.post(self.expenses_url, {
            'amount': '120.00', 'category_name': 'Shopping', 'date': '2026-07-20', 'description': 'Late expense'
        }, format='json')

        # Filter by start_date and end_date
        res_filtered = self.client_a.get(self.expenses_url, {'start_date': '2026-06-01', 'end_date': '2026-06-30'})
        self.assertEqual(res_filtered.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_filtered.data), 1)
        self.assertEqual(res_filtered.data[0]['description'], 'Mid expense')

    def test_zero_records_empty_state_summary(self):
        # User B has no records
        res_summary_b = self.client_b.get(self.summary_url)
        self.assertEqual(res_summary_b.status_code, status.HTTP_200_OK)
        data = res_summary_b.data
        self.assertEqual(data['balance'], 0.0)
        self.assertEqual(data['total_income'], 0.0)
        self.assertEqual(data['total_expenses'], 0.0)
        self.assertEqual(data['monthly_income'], 0.0)
        self.assertEqual(data['monthly_expenses'], 0.0)
        self.assertEqual(data['savings_rate'], 0.0)
        self.assertEqual(len(data['recent_transactions']), 0)
        self.assertEqual(len(data['category_breakdown']), 0)
