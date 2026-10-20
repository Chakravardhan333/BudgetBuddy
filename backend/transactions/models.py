from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal

class Category(models.Model):
    TYPE_CHOICES = (
        ('expense', 'Expense'),
        ('income', 'Income'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='custom_categories')
    name = models.CharField(max_length=100)
    category_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='expense')
    icon = models.CharField(max_length=50, default='Tag')
    color = models.CharField(max_length=50, default='#10b981')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        unique_together = ('user', 'name', 'category_type')

    def __str__(self):
        return f"{self.name} ({self.get_category_type_display()})"


class Expense(models.Model):
    PAYMENT_METHODS = (
        ('card', 'Credit / Debit Card'),
        ('cash', 'Cash'),
        ('upi', 'UPI / Online Transfer'),
        ('bank', 'Bank Transfer'),
        ('other', 'Other'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='expenses')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category_name = models.CharField(max_length=100, default='Miscellaneous')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    date = models.DateField()
    description = models.CharField(max_length=255)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='card')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.description}: {self.amount}"


class Income(models.Model):
    SOURCES = (
        ('salary', 'Salary'),
        ('freelance', 'Freelance Work'),
        ('scholarship', 'Scholarship'),
        ('pocket_money', 'Pocket Money'),
        ('part_time', 'Part-time Job'),
        ('family', 'Family Support'),
        ('investments', 'Investments / Dividends'),
        ('other', 'Other'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='incomes')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    source = models.CharField(max_length=30, choices=SOURCES, default='salary')
    date = models.DateField()
    description = models.CharField(max_length=255)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.description}: {self.amount}"


class Budget(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budgets')
    month = models.PositiveSmallIntegerField() # 1 - 12
    year = models.PositiveSmallIntegerField()
    monthly_limit = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=100, blank=True, null=True) # None = overall limit
    warning_threshold = models.PositiveSmallIntegerField(default=80) # percentage
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-year', '-month']
        unique_together = ('user', 'month', 'year', 'category')

    def __str__(self):
        cat = self.category or "Overall"
        return f"{self.user.username} [{self.month}/{self.year}] {cat}: {self.monthly_limit}"


class SavingsGoal(models.Model):
    STATUS_CHOICES = (
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='savings_goals')
    title = models.CharField(max_length=150)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    target_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['target_date', '-created_at']

    def update_status(self):
        if self.current_amount >= self.target_amount:
            self.status = 'completed'
        elif self.status == 'completed' and self.current_amount < self.target_amount:
            self.status = 'in_progress'

    def __str__(self):
        return f"{self.user.username} - {self.title} ({self.current_amount}/{self.target_amount})"


class GoalContribution(models.Model):
    goal = models.ForeignKey(SavingsGoal, on_delete=models.CASCADE, related_name='contributions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='goal_contributions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self.goal.current_amount += self.amount
            self.goal.update_status()
            self.goal.save()

    def __str__(self):
        return f"Contribution {self.amount} -> {self.goal.title}"
