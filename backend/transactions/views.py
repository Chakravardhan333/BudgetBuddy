from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Q
from django.db import transaction as db_transaction
from datetime import datetime, date
from decimal import Decimal

from .models import Category, Expense, Income, Budget, SavingsGoal, GoalContribution
from .serializers import (
    CategorySerializer,
    ExpenseSerializer,
    IncomeSerializer,
    BudgetSerializer,
    SavingsGoalSerializer,
    GoalContributionSerializer,
)

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return system default categories (user is None) plus user's custom categories
        return Category.objects.filter(Q(user=self.request.user) | Q(user__isnull=True))

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Strict user isolation: users only see their own expenses
        qs = Expense.objects.filter(user=self.request.user)
        
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category_name__iexact=category)

        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year and month:
            qs = qs.filter(date__year=year, date__month=month)
        elif year:
            qs = qs.filter(date__year=year)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(description__icontains=search) | Q(notes__icontains=search) | Q(category_name__icontains=search))

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class IncomeViewSet(viewsets.ModelViewSet):
    serializer_class = IncomeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Strict user isolation
        qs = Income.objects.filter(user=self.request.user)

        source = self.request.query_params.get('source')
        if source:
            qs = qs.filter(source__iexact=source)

        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year and month:
            qs = qs.filter(date__year=year, date__month=month)
        elif year:
            qs = qs.filter(date__year=year)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(description__icontains=search) | Q(notes__icontains=search))

        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Budget.objects.filter(user=self.request.user)
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if year and month:
            qs = qs.filter(year=year, month=month)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class SavingsGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def contribute(self, request, pk=None):
        goal = self.get_object()
        amount = request.data.get('amount')
        contribution_date = request.data.get('date', date.today().isoformat())
        notes = request.data.get('notes', '')

        if not amount or Decimal(str(amount)) <= 0:
            return Response({"amount": ["Contribution amount must be greater than zero."]}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic():
            contribution = GoalContribution.objects.create(
                goal=goal,
                user=request.user,
                amount=Decimal(str(amount)),
                date=contribution_date,
                notes=notes
            )

        serializer = SavingsGoalSerializer(goal)
        return Response({
            "message": "Contribution recorded successfully.",
            "goal": serializer.data,
            "contribution": GoalContributionSerializer(contribution).data
        }, status=status.HTTP_201_CREATED)


class DashboardSummaryView(APIView):
    """
    GET /api/transactions/dashboard-summary/
    Calculates live net balance, monthly income, monthly expenses, budget status, and recent activity
    from actual database records for the authenticated user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()
        current_year = today.year
        current_month = today.month

        # Lifetime Aggregates
        all_incomes = Income.objects.filter(user=user).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        all_expenses = Expense.objects.filter(user=user).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        current_balance = all_incomes - all_expenses

        # Current Month Inflow & Outlay
        month_incomes = Income.objects.filter(
            user=user, date__year=current_year, date__month=current_month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        month_expenses = Expense.objects.filter(
            user=user, date__year=current_year, date__month=current_month
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Savings Goals Stash
        savings_total = SavingsGoal.objects.filter(user=user, status='in_progress').aggregate(
            total=Sum('current_amount')
        )['total'] or Decimal('0.00')

        # Monthly Budget
        overall_budget = Budget.objects.filter(
            user=user, year=current_year, month=current_month, category__isnull=True
        ).first()

        budget_limit = Decimal('0.00')
        if overall_budget:
            budget_limit = overall_budget.monthly_limit
        elif hasattr(user, 'profile') and user.profile.monthly_budget_target > 0:
            budget_limit = user.profile.monthly_budget_target

        budget_used_percent = 0.0
        if budget_limit > 0:
            budget_used_percent = round(float((month_expenses / budget_limit) * 100), 2)

        # Category spending breakdown for current month
        cat_spending_qs = Expense.objects.filter(
            user=user, date__year=current_year, date__month=current_month
        ).values('category_name').annotate(total=Sum('amount')).order_by('-total')

        category_breakdown = [
            {"category": item['category_name'], "amount": float(item['total'])}
            for item in cat_spending_qs
        ]

        # Recent 5 transactions (combined expenses + incomes)
        recent_expenses = list(Expense.objects.filter(user=user).order_by('-date', '-created_at')[:5])
        recent_incomes = list(Income.objects.filter(user=user).order_by('-date', '-created_at')[:5])

        combined_records = []
        for exp in recent_expenses:
            combined_records.append({
                "id": f"exp-{exp.id}",
                "type": "expense",
                "title": exp.description,
                "amount": float(exp.amount),
                "category": exp.category_name,
                "date": exp.date.isoformat(),
                "payment_method": exp.get_payment_method_display(),
            })

        for inc in recent_incomes:
            combined_records.append({
                "id": f"inc-{inc.id}",
                "type": "income",
                "title": inc.description,
                "amount": float(inc.amount),
                "category": inc.get_source_display(),
                "date": inc.date.isoformat(),
                "payment_method": "Inflow",
            })

        combined_records.sort(key=lambda x: x['date'], reverse=True)
        recent_records = combined_records[:6]

        return Response({
            "balance": float(current_balance),
            "monthly_income": float(month_incomes),
            "monthly_expenses": float(month_expenses),
            "monthly_savings": float(savings_total),
            "budget_limit": float(budget_limit),
            "budget_used_percent": budget_used_percent,
            "category_breakdown": category_breakdown,
            "recent_transactions": recent_records,
            "currency": getattr(user.profile, 'currency', 'USD') if hasattr(user, 'profile') else 'USD',
            "currency_symbol": getattr(user.profile, 'currency_symbol', '$') if hasattr(user, 'profile') else '$',
        }, status=status.HTTP_200_OK)
