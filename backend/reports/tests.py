from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from datetime import date
from transactions.models import Expense, Income, Budget, SavingsGoal

class ReportsExportTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='report_user', email='report@budgetbuddy.test', password='Password123!'
        )
        login_res = self.client.post(reverse('login'), {'username': 'report_user', 'password': 'Password123!'})
        self.token = login_res.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

        # Seed sample data for the user
        Income.objects.create(
            user=self.user, amount=Decimal('2000.00'), source='salary',
            date=date.today(), description='Monthly Salary'
        )
        Expense.objects.create(
            user=self.user, amount=Decimal('150.00'), category_name='Food & Dining',
            date=date.today(), description='Dinner with family', payment_method='card'
        )
        Budget.objects.create(
            user=self.user, month=date.today().month, year=date.today().year,
            monthly_limit=Decimal('500.00')
        )
        SavingsGoal.objects.create(
            user=self.user, title='Laptop Fund', target_amount=Decimal('1000.00'),
            current_amount=Decimal('500.00'), target_date=date(2026, 12, 31)
        )

        self.pdf_url = reverse('export_pdf')
        self.excel_url = reverse('export_excel')

    def test_export_pdf_success(self):
        response = self.client.get(self.pdf_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
        self.assertTrue(response.content.startswith(b'%PDF-'))
        self.assertIn('attachment; filename=', response['Content-Disposition'])

    def test_export_excel_success(self):
        response = self.client.get(self.excel_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        # Check ZIP / XLSX signature
        self.assertTrue(response.content.startswith(b'PK\x03\x04'))
        self.assertIn('attachment; filename=', response['Content-Disposition'])

    def test_reports_require_authentication(self):
        unauth_client = APIClient()
        pdf_res = unauth_client.get(self.pdf_url)
        self.assertEqual(pdf_res.status_code, status.HTTP_401_UNAUTHORIZED)
        excel_res = unauth_client.get(self.excel_url)
        self.assertEqual(excel_res.status_code, status.HTTP_401_UNAUTHORIZED)
