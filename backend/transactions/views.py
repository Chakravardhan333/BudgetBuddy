from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Q
from django.db import transaction as db_transaction
from datetime import datetime, date, timedelta
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

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(description__icontains=search) | Q(notes__icontains=search) | Q(category_name__icontains=search))

        return qs

    def _sync_notifications(self):
        try:
            from notifications.services import trigger_user_notifications
            trigger_user_notifications(self.request.user)
        except Exception:
            pass

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        self._sync_notifications()

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)
        self._sync_notifications()

    def perform_destroy(self, instance):
        instance.delete()
        self._sync_notifications()


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

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)

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

    def _sync_notifications(self):
        try:
            from notifications.services import trigger_user_notifications
            trigger_user_notifications(self.request.user)
        except Exception:
            pass

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        self._sync_notifications()

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)
        self._sync_notifications()

    def perform_destroy(self, instance):
        instance.delete()


class SavingsGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def _sync_notifications(self):
        try:
            from notifications.services import trigger_user_notifications
            trigger_user_notifications(self.request.user)
        except Exception:
            pass

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        self._sync_notifications()

    def perform_update(self, serializer):
        serializer.save(user=self.request.user)
        self._sync_notifications()

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

        self._sync_notifications()

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

        # Savings Goals Stash & Progress
        goals_qs = SavingsGoal.objects.filter(user=user)
        savings_total = goals_qs.aggregate(total=Sum('current_amount'))['total'] or Decimal('0.00')
        total_goal_target = goals_qs.aggregate(total=Sum('target_amount'))['total'] or Decimal('0.00')
        goals_progress_percent = round(float((savings_total / total_goal_target) * 100), 2) if total_goal_target > 0 else 0.0

        # Timeframe Summaries
        # 1. Today
        today_incomes = Income.objects.filter(user=user, date=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        today_expenses = Expense.objects.filter(user=user, date=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 2. This Week (Monday to Sunday)
        week_start = today - timedelta(days=today.weekday())
        week_incomes = Income.objects.filter(user=user, date__gte=week_start, date__lte=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        week_expenses = Expense.objects.filter(user=user, date__gte=week_start, date__lte=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # 3. This Year
        year_incomes = Income.objects.filter(user=user, date__year=current_year).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        year_expenses = Expense.objects.filter(user=user, date__year=current_year).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Savings Rate Formula: max(0, ((month_incomes - month_expenses) / month_incomes) * 100)
        savings_rate = 0.0
        if month_incomes > Decimal('0.00'):
            savings_rate = round(float(max(Decimal('0.00'), ((month_incomes - month_expenses) / month_incomes) * Decimal('100.0'))), 2)

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

        # Recent 6 transactions (combined expenses + incomes)
        recent_expenses = list(Expense.objects.filter(user=user).order_by('-date', '-created_at')[:6])
        recent_incomes = list(Income.objects.filter(user=user).order_by('-date', '-created_at')[:6])

        combined_records = []
        for exp in recent_expenses:
            combined_records.append({
                "id": f"exp-{exp.id}",
                "raw_id": exp.id,
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
                "raw_id": inc.id,
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
            "total_income": float(all_incomes),
            "total_expenses": float(all_expenses),
            "monthly_income": float(month_incomes),
            "monthly_expenses": float(month_expenses),
            "monthly_savings": float(savings_total),
            "savings_rate": savings_rate,
            "budget_limit": float(budget_limit),
            "budget_used_percent": budget_used_percent,
            "savings_goal_progress": goals_progress_percent,
            "total_goal_target": float(total_goal_target),
            "total_goal_saved": float(savings_total),
            "timeframe_summaries": {
                "today": {"income": float(today_incomes), "expenses": float(today_expenses), "balance": float(today_incomes - today_expenses)},
                "this_week": {"income": float(week_incomes), "expenses": float(week_expenses), "balance": float(week_incomes - week_expenses)},
                "this_month": {"income": float(month_incomes), "expenses": float(month_expenses), "balance": float(month_incomes - month_expenses)},
                "this_year": {"income": float(year_incomes), "expenses": float(year_expenses), "balance": float(year_incomes - year_expenses)},
            },
            "category_breakdown": category_breakdown,
            "recent_transactions": recent_records,
            "currency": getattr(user.profile, 'currency', 'USD') if hasattr(user, 'profile') else 'USD',
            "currency_symbol": getattr(user.profile, 'currency_symbol', '$') if hasattr(user, 'profile') else '$',
        }, status=status.HTTP_200_OK)
