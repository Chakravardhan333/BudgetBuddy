from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    ExpenseViewSet,
    IncomeViewSet,
    BudgetViewSet,
    SavingsGoalViewSet,
    DashboardSummaryView,
)

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('expenses', ExpenseViewSet, basename='expense')
router.register('income', IncomeViewSet, basename='income')
router.register('budgets', BudgetViewSet, basename='budget')
router.register('goals', SavingsGoalViewSet, basename='savings_goal')

urlpatterns = [
    path('dashboard-summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('', include(router.urls)),
]
