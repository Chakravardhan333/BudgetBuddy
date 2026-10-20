from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class UserProfile(models.Model):
    ROLE_CHOICES = (
        ('student', 'Student'),
        ('premium', 'Premium User'),
        ('admin', 'Admin'),
    )

    CURRENCY_SYMBOLS = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
        'CAD': 'C$',
        'AUD': 'A$',
        'JPY': '¥',
    }

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='student')
    currency = models.CharField(max_length=10, default='USD')
    currency_symbol = models.CharField(max_length=5, default='$')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    monthly_budget_target = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Automatically align currency symbol with selected currency
        if self.currency in self.CURRENCY_SYMBOLS:
            self.currency_symbol = self.CURRENCY_SYMBOLS[self.currency]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} ({self.get_role_display()})"


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        role = 'admin' if instance.is_superuser else 'student'
        UserProfile.objects.create(user=instance, role=role)
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
