from django.contrib import admin
from .models import Notification, Reminder

# Register your models here.


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'category', 'reminder_datetime', 'is_completed', 'is_dismissed', 'created_at')
    list_filter = ('category', 'is_completed', 'is_dismissed')
    search_fields = ('title', 'message')
