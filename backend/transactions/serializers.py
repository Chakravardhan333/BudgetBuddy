from rest_framework import serializers
from decimal import Decimal
from datetime import date
from django.db.models import Sum
from .models import Category, Expense, Income, Budget, SavingsGoal, GoalContribution

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'category_type', 'icon', 'color', 'created_at')
        read_only_fields = ('id', 'created_at')

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = (
            'id',
            'amount',
            'category_name',
            'category',
            'date',
            'description',
            'payment_method',
            'notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Expense amount must be greater than zero.")
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = (
            'id',
            'amount',
            'source',
            'date',
            'description',
            'notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Income amount must be greater than zero.")
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class BudgetSerializer(serializers.ModelSerializer):
    actual_spending = serializers.SerializerMethodField()
    remaining_budget = serializers.SerializerMethodField()
    utilization_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Budget
        fields = (
            'id',
            'month',
            'year',
            'monthly_limit',
            'category',
            'warning_threshold',
            'actual_spending',
            'remaining_budget',
            'utilization_percentage',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'actual_spending', 'remaining_budget', 'utilization_percentage')

    def validate_monthly_limit(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Budget limit must be greater than zero.")
        return value

    def get_actual_spending(self, obj):
        expenses = Expense.objects.filter(
            user=obj.user,
            date__year=obj.year,
            date__month=obj.month,
        )
        if obj.category:
            expenses = expenses.filter(category_name__iexact=obj.category)
        total = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return float(total)

    def get_remaining_budget(self, obj):
        spending = Decimal(str(self.get_actual_spending(obj)))
        return float(obj.monthly_limit - spending)

    def get_utilization_percentage(self, obj):
        if obj.monthly_limit <= 0:
            return 0.0
        spending = Decimal(str(self.get_actual_spending(obj)))
        pct = (spending / obj.monthly_limit) * 100
        return round(float(pct), 2)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class GoalContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoalContribution
        fields = ('id', 'goal', 'amount', 'date', 'notes', 'created_at')
        read_only_fields = ('id', 'created_at')

    def validate_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Contribution amount must be greater than zero.")
        return value

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class SavingsGoalSerializer(serializers.ModelSerializer):
    contributions = GoalContributionSerializer(many=True, read_only=True)
    progress_percentage = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = (
            'id',
            'title',
            'target_amount',
            'current_amount',
            'target_date',
            'status',
            'notes',
            'progress_percentage',
            'contributions',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'progress_percentage')

    def validate_target_amount(self, value):
        if value <= Decimal('0.00'):
            raise serializers.ValidationError("Target amount must be greater than zero.")
        return value

    def get_progress_percentage(self, obj):
        if obj.target_amount <= 0:
            return 0.0
        pct = (obj.current_amount / obj.target_amount) * 100
        return round(float(min(pct, 100)), 2)

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
