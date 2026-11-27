import logging
import re
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

FRONTEND_BASE_URL = getattr(settings, 'FRONTEND_BASE_URL', 'https://budget-buddy-sigma-two.vercel.app')


def render_budgetbuddy_email(
    title,
    badge_text,
    badge_type="info",  # 'success' | 'warning' | 'alert' | 'info'
    headline="",
    greeting="",
    body_paragraphs=None,
    section_title="DETAILS",
    details=None,
    cta_text="View in BudgetBuddy",
    cta_url=None,
    outro_paragraphs=None,
):
    """
    Renders a responsive, modern dark-themed HTML email for BudgetBuddy notifications.
    Matches BudgetBuddy's aesthetic: dark navy background (#0b0f19), slate container (#1e293b),
    emerald accents (#10b981), blue highlights, and clean structured financial cards.
    Fully readable across desktop and mobile email clients (including Gmail).
    """
    body_paragraphs = body_paragraphs or []
    outro_paragraphs = outro_paragraphs or []
    details = details or {}
    cta_url = cta_url or f"{FRONTEND_BASE_URL}/notifications"

    # Color palette matching dark-theme notification center
    badge_colors = {
        'success': {'bg': '#064e3b', 'text': '#34d399', 'border': '#059669'},
        'warning': {'bg': '#78350f', 'text': '#fbbf24', 'border': '#d97706'},
        'alert':   {'bg': '#7f1d1d', 'text': '#f87171', 'border': '#dc2626'},
        'info':    {'bg': '#1e3a8a', 'text': '#60a5fa', 'border': '#2563eb'},
    }
    badge_style = badge_colors.get(badge_type, badge_colors['info'])

    # Build intro paragraphs HTML
    intro_html = "".join(
        f'<p style="margin: 0 0 14px 0; color: #cbd5e1; font-size: 15px; line-height: 1.6;">{p}</p>'
        for p in body_paragraphs
    )

    # Build outro paragraphs HTML
    outro_html = "".join(
        f'<p style="margin: 14px 0 0 0; color: #cbd5e1; font-size: 14px; line-height: 1.6;">{p}</p>'
        for p in outro_paragraphs
    )

    # Build details table HTML
    details_html = ""
    if details:
        rows_html = ""
        for key, val in details.items():
            # Format status or priority badges if detected in value
            val_str = str(val)
            val_render = val_str
            val_lower = val_str.lower()
            if 'urgent' in val_lower or 'overdue' in val_lower:
                val_render = f'<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; background-color: #7f1d1d; color: #fca5a5; border: 1px solid #ef4444;">{val_str}</span>'
            elif 'high' in val_lower:
                val_render = f'<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; background-color: #78350f; color: #fde68a; border: 1px solid #f59e0b;">{val_str}</span>'
            elif 'due now' in val_lower or 'pending' in val_lower:
                val_render = f'<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; background-color: #1e3a8a; color: #93c5fd; border: 1px solid #3b82f6;">{val_str}</span>'
            elif 'achieved' in val_lower or 'completed' in val_lower:
                val_render = f'<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; background-color: #064e3b; color: #6ee7b7; border: 1px solid #10b981;">{val_str}</span>'

            rows_html += f"""
            <tr>
              <td style="padding: 10px 16px; border-bottom: 1px solid #334155; color: #94a3b8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; width: 42%; vertical-align: middle;">{key}</td>
              <td style="padding: 10px 16px; border-bottom: 1px solid #334155; color: #f8fafc; font-size: 14px; font-weight: 600; text-align: right; vertical-align: middle;">{val_render}</td>
            </tr>
            """
        details_html = f"""
        <div style="margin: 22px 0 16px 0;">
          <div style="color: #38bdf8; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            {section_title}
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; border: 1px solid #334155; border-radius: 10px; border-collapse: collapse; overflow: hidden;">
            <tbody>
              {rows_html}
            </tbody>
          </table>
        </div>
        """

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #1e293b; border-radius: 14px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);">
          <!-- Header Bar -->
          <tr>
            <td style="padding: 22px 28px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border-bottom: 1px solid #334155;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 21px; font-weight: 800; color: #10b981; letter-spacing: -0.5px;">BudgetBuddy</span>
                    <span style="font-size: 12px; color: #64748b; margin-left: 8px; font-weight: 500;">Personal Finance</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; background-color: {badge_style['bg']}; color: {badge_style['text']}; border: 1px solid {badge_style['border']};">
                      {badge_text}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 28px 28px 24px 28px;">
              {f'<p style="margin: 0 0 12px 0; color: #f1f5f9; font-size: 16px; font-weight: 600;">{greeting}</p>' if greeting else ''}
              {f'<h2 style="margin: 0 0 18px 0; color: #f8fafc; font-size: 20px; font-weight: 700; line-height: 1.3;">{headline}</h2>' if headline else ''}
              {intro_html}
              {details_html}
              {outro_html}

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 26px; margin-bottom: 10px;">
                <tr>
                  <td align="center">
                    <a href="{cta_url}" target="_blank" style="display: inline-block; padding: 13px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                      {cta_text} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #0f172a; border-top: 1px solid #334155; text-align: center;">
              <p style="margin: 0 0 6px 0; color: #94a3b8; font-size: 12px; font-weight: 600;">
                BudgetBuddy &bull; Personal Budget Planning &amp; Expense Management Platform
              </p>
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                You received this notification because email alerts are enabled in your BudgetBuddy account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""
    return html


# ─── 1. REMINDER DUE EMAIL ───
def build_reminder_due_email(user, reminder):
    """
    Creates a personalized, professional HTML email for a scheduled reminder that is due.
    Subject: BudgetBuddy – Your Financial Reminder Is Due
    """
    user_name = user.get_full_name() or user.first_name or user.username
    reminder_title = reminder.title
    reminder_category = reminder.get_category_display()
    reminder_priority = reminder.get_priority_display()
    due_date = reminder.reminder_datetime.strftime('%b %d, %Y')
    due_time = reminder.reminder_datetime.strftime('%I:%M %p UTC')
    status = "Due Now"
    cta_url = f"{FRONTEND_BASE_URL}/notifications?tab=reminders"

    subject = f"BudgetBuddy – Your Financial Reminder Is Due: {reminder_title}"
    plain_text = (
        f"Hello {user_name},\n\n"
        f"This is a reminder from BudgetBuddy that one of your scheduled financial activities is due.\n\n"
        f"REMINDER DETAILS\n\n"
        f"Reminder Title: {reminder_title}\n"
        f"Category: {reminder_category}\n"
        f"Priority: {reminder_priority}\n"
        f"Due Date: {due_date}\n"
        f"Due Time: {due_time}\n"
        f"Status: {status}\n\n"
        f"Please review your reminder and take the necessary action.\n\n"
        f"Open BudgetBuddy to view and manage your reminder: {cta_url}\n\n"
        f"Button: View Reminder"
    )

    details = {
        "Reminder Title": reminder_title,
        "Category": reminder_category,
        "Priority": reminder_priority,
        "Due Date": due_date,
        "Due Time": due_time,
        "Status": status,
    }
    if reminder.message:
        details["Notes"] = reminder.message

    html = render_budgetbuddy_email(
        title="BudgetBuddy – Your Financial Reminder Is Due",
        badge_text="Reminder Due",
        badge_type="warning" if reminder.priority in ('high', 'urgent') else "info",
        headline="Your Financial Reminder Is Due",
        greeting=f"Hello {user_name},",
        body_paragraphs=[
            "This is a reminder from BudgetBuddy that one of your scheduled financial activities is due.",
        ],
        section_title="REMINDER DETAILS",
        details=details,
        outro_paragraphs=[
            "Please review your reminder and take the necessary action.",
            "Open BudgetBuddy to view and manage your reminder.",
        ],
        cta_text="View Reminder",
        cta_url=cta_url,
    )
    return subject, plain_text, html


# ─── 2. OVERDUE REMINDER EMAIL ───
def build_overdue_reminder_email(user, reminder):
    """
    Creates a personalized, professional HTML email for a reminder that is overdue.
    Subject: BudgetBuddy – Important! Your Reminder Is Overdue
    """
    user_name = user.get_full_name() or user.first_name or user.username
    reminder_title = reminder.title
    reminder_category = reminder.get_category_display()
    reminder_priority = reminder.get_priority_display()
    due_date = reminder.reminder_datetime.strftime('%b %d, %Y')
    due_time = reminder.reminder_datetime.strftime('%I:%M %p UTC')
    status = "Overdue"
    cta_url = f"{FRONTEND_BASE_URL}/notifications?tab=reminders"

    subject = f"BudgetBuddy – Important! Your Reminder Is Overdue (Overdue Alert: {reminder_title})"
    plain_text = (
        f"Hello {user_name},\n\n"
        f"Your scheduled financial reminder has passed its due date.\n\n"
        f"REMINDER DETAILS\n\n"
        f"Title: {reminder_title}\n"
        f"Category: {reminder_category}\n"
        f"Priority: {reminder_priority}\n"
        f"Scheduled Date: {due_date}\n"
        f"Scheduled Time: {due_time}\n"
        f"Status: {status}\n\n"
        f"Please take action as soon as possible: {cta_url}\n\n"
        f"Button: Manage Reminder"
    )

    details = {
        "Title": reminder_title,
        "Category": reminder_category,
        "Priority": reminder_priority,
        "Scheduled Date": due_date,
        "Scheduled Time": due_time,
        "Status": status,
    }
    if reminder.message:
        details["Notes"] = reminder.message

    html = render_budgetbuddy_email(
        title="BudgetBuddy – Important! Your Reminder Is Overdue",
        badge_text="Overdue Alert",
        badge_type="alert",
        headline=f"Overdue: {reminder_title}",
        greeting=f"Hello {user_name},",
        body_paragraphs=[
            "Your scheduled financial reminder has passed its due date.",
        ],
        section_title="REMINDER DETAILS",
        details=details,
        outro_paragraphs=[
            "Please take action as soon as possible to keep your financial records current.",
        ],
        cta_text="Manage Reminder",
        cta_url=cta_url,
    )
    return subject, plain_text, html


# ─── 3. PAYMENT DEADLINE EMAIL ───
def build_payment_deadline_email(user, reminder):
    """
    Creates a personalized, professional HTML email for an upcoming payment deadline.
    Subject: BudgetBuddy – Upcoming Payment Reminder
    """
    profile = getattr(user, 'profile', None)
    currency = getattr(profile, 'currency', 'INR')
    currency_symbol = getattr(profile, 'currency_symbol', '₹')
    user_name = user.get_full_name() or user.first_name or user.username
    payment_name = reminder.title
    category = reminder.get_category_display()
    due_date = reminder.reminder_datetime.strftime('%b %d, %Y')
    due_time = reminder.reminder_datetime.strftime('%I:%M %p UTC')
    status = "Pending"
    cta_url = f"{FRONTEND_BASE_URL}/notifications?tab=reminders"

    # Extract amount if present in title or message
    combined_text = f"{reminder.title} {reminder.message}"
    match = re.search(r'[\$€£₹]?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)', combined_text)
    if match and float(match.group(1).replace(',', '')) > 0:
        amount_display = f"{currency_symbol}{match.group(1)}"
    else:
        amount_display = f"{currency_symbol} Scheduled"

    subject = f"BudgetBuddy – Upcoming Payment Reminder (Payment Notice: {payment_name})"
    plain_text = (
        f"Hello {user_name},\n\n"
        f"This is a friendly reminder about your upcoming financial payment.\n\n"
        f"PAYMENT DETAILS\n\n"
        f"Payment Name: {payment_name}\n"
        f"Amount: {amount_display}\n"
        f"Currency: {currency}\n"
        f"Payment Category: {category}\n"
        f"Due Date: {due_date} at {due_time}\n"
        f"Payment Status: {status}\n\n"
        f"Please ensure that you complete your payment before the deadline: {cta_url}\n\n"
        f"Button: View Payments"
    )

    details = {
        "Payment Name": payment_name,
        "Amount": amount_display,
        "Currency": currency,
        "Payment Category": category,
        "Due Date": f"{due_date} at {due_time}",
        "Payment Status": status,
    }
    if reminder.message:
        details["Payment Notes"] = reminder.message

    html = render_budgetbuddy_email(
        title="BudgetBuddy – Upcoming Payment Reminder",
        badge_text="Payment Deadline",
        badge_type="alert" if reminder.priority in ('high', 'urgent') else "warning",
        headline=f"Payment Deadline: {payment_name}",
        greeting=f"Hello {user_name},",
        body_paragraphs=[
            "This is a friendly reminder about your upcoming financial payment.",
        ],
        section_title="PAYMENT DETAILS",
        details=details,
        outro_paragraphs=[
            "Please ensure that you complete your payment before the deadline to avoid any late fees or disruptions.",
        ],
        cta_text="View Payments",
        cta_url=cta_url,
    )
    return subject, plain_text, html


# ─── 4 & 5. BUDGET THRESHOLD & EXCEEDED EMAILS ───
def build_budget_threshold_email(user, budget, spending, limit, alert_type):
    """
    Creates a personalized, professional HTML email for budget warning and budget exceeded alerts.
    4. Budget Threshold Warning: Subject: BudgetBuddy – Budget Limit Alert
    5. Budget Exceeded:          Subject: BudgetBuddy – Your Budget Limit Has Been Exceeded
    """
    profile = getattr(user, 'profile', None)
    currency = getattr(profile, 'currency', 'INR')
    currency_symbol = getattr(profile, 'currency_symbol', '₹')
    user_name = user.get_full_name() or user.first_name or user.username
    budget_name = budget.category or "Overall Monthly"
    pct = round((spending / limit) * 100, 1) if limit > 0 else 100.0

    if alert_type == 'exceeded':
        subject = f"BudgetBuddy – Your Budget Limit Has Been Exceeded (Budget Exceeded: {budget_name})"
        exceeded_val = max(0.0, float(spending - limit))
        cta_url = f"{FRONTEND_BASE_URL}/expenses"

        plain_text = (
            f"Hello {user_name},\n\n"
            f"Your spending has exceeded the configured budget limit.\n\n"
            f"BUDGET SUMMARY\n\n"
            f"Budget Name: {budget_name}\n"
            f"Budget Limit: {currency_symbol}{limit:.2f}\n"
            f"Total Spent: {currency_symbol}{spending:.2f}\n"
            f"Exceeded Amount: {currency_symbol}{exceeded_val:.2f}\n"
            f"Currency: {currency}\n\n"
            f"Please review your expenses and adjust your spending: {cta_url}\n\n"
            f"Button: Review Expenses"
        )

        details = {
            "Budget Name": budget_name,
            "Budget Limit": f"{currency_symbol}{limit:.2f}",
            "Total Spent": f"{currency_symbol}{spending:.2f}",
            "Exceeded Amount": f"{currency_symbol}{exceeded_val:.2f}",
            "Currency": currency,
        }

        html = render_budgetbuddy_email(
            title="BudgetBuddy – Your Budget Limit Has Been Exceeded",
            badge_text="Budget Exceeded",
            badge_type="alert",
            headline=f"Budget Cap Exceeded: {budget_name}",
            greeting=f"Hello {user_name},",
            body_paragraphs=[
                "Your spending has exceeded the configured budget limit.",
            ],
            section_title="BUDGET SUMMARY",
            details=details,
            outro_paragraphs=[
                "Please review your expenses and adjust your spending to restore your savings targets.",
            ],
            cta_text="Review Expenses",
            cta_url=cta_url,
        )
    else:
        subject = f"BudgetBuddy – Budget Limit Alert (80% Budget Threshold Reached: {budget_name})"
        remaining_val = max(0.0, float(limit - spending))
        cta_url = f"{FRONTEND_BASE_URL}/budgets"

        plain_text = (
            f"Hello {user_name},\n\n"
            f"Your spending has reached a configured budget warning threshold.\n\n"
            f"BUDGET DETAILS\n\n"
            f"Budget Name: {budget_name}\n"
            f"Budget Limit: {currency_symbol}{limit:.2f}\n"
            f"Amount Spent: {currency_symbol}{spending:.2f}\n"
            f"Remaining Budget: {currency_symbol}{remaining_val:.2f}\n"
            f"Usage Percentage: {pct}%\n\n"
            f"Please review your spending and manage your remaining budget carefully: {cta_url}\n\n"
            f"Button: View Budget"
        )

        details = {
            "Budget Name": budget_name,
            "Budget Limit": f"{currency_symbol}{limit:.2f}",
            "Amount Spent": f"{currency_symbol}{spending:.2f}",
            "Remaining Budget": f"{currency_symbol}{remaining_val:.2f}",
            "Usage Percentage": f"{pct}%",
        }

        html = render_budgetbuddy_email(
            title="BudgetBuddy – Budget Limit Alert",
            badge_text="80% Threshold",
            badge_type="warning",
            headline=f"80% Budget Threshold Warning: {budget_name}",
            greeting=f"Hello {user_name},",
            body_paragraphs=[
                "Your spending has reached a configured budget warning threshold.",
            ],
            section_title="BUDGET DETAILS",
            details=details,
            outro_paragraphs=[
                "Please review your spending and manage your remaining budget carefully.",
            ],
            cta_text="View Budget",
            cta_url=cta_url,
        )

    return subject, plain_text, html


# ─── 6. EXPENSE RECORDED EMAIL ───
def build_expense_recorded_email(user, expense):
    """
    Creates a personalized, professional HTML email when a new expense is logged.
    Subject: BudgetBuddy – New Expense Recorded
    """
    profile = getattr(user, 'profile', None)
    currency_symbol = getattr(profile, 'currency_symbol', '₹')
    user_name = user.get_full_name() or user.first_name or user.username
    expense_title = expense.description or f"Expense for {expense.category_name or 'General'}"
    expense_category = expense.category_name or "General"
    expense_amount = f"{currency_symbol}{expense.amount:.2f}"
    expense_date = expense.date.strftime('%b %d, %Y') if hasattr(expense.date, 'strftime') else str(expense.date)
    expense_description = expense.description or "None provided"
    cta_url = f"{FRONTEND_BASE_URL}/expenses"

    subject = f"BudgetBuddy – New Expense Recorded: {expense_amount} ({expense_category})"
    plain_text = (
        f"Hello {user_name},\n\n"
        f"A new expense has been successfully recorded in your BudgetBuddy account.\n\n"
        f"EXPENSE DETAILS\n\n"
        f"Expense Title: {expense_title}\n"
        f"Category: {expense_category}\n"
        f"Amount: {expense_amount}\n"
        f"Date: {expense_date}\n"
        f"Description: {expense_description}\n\n"
        f"Your financial records have been updated: {cta_url}\n\n"
        f"Button: View Transactions"
    )

    details = {
        "Expense Title": expense_title,
        "Category": expense_category,
        "Amount": expense_amount,
        "Date": expense_date,
        "Description": expense_description,
    }

    html = render_budgetbuddy_email(
        title="BudgetBuddy – New Expense Recorded",
        badge_text="Expense Recorded",
        badge_type="info",
        headline=f"New Expense Recorded: {expense_amount}",
        greeting=f"Hello {user_name},",
        body_paragraphs=[
            "A new expense has been successfully recorded in your BudgetBuddy account.",
        ],
        section_title="EXPENSE DETAILS",
        details=details,
        outro_paragraphs=[
            "Your financial records have been updated.",
        ],
        cta_text="View Transactions",
        cta_url=cta_url,
    )
    return subject, plain_text, html


# ─── 7. SAVINGS GOAL EMAIL ───
def build_savings_milestone_email(user, goal, milestone_type="50"):
    """
    Creates a personalized, professional HTML email for savings goal updates and progress milestones.
    Subject: BudgetBuddy – Savings Goal Update
    """
    profile = getattr(user, 'profile', None)
    currency_symbol = getattr(profile, 'currency_symbol', '₹')
    user_name = user.get_full_name() or user.first_name or user.username
    goal_name = goal.title
    target_amount = f"{currency_symbol}{goal.target_amount:.2f}"
    current_amount = f"{currency_symbol}{goal.current_amount:.2f}"
    remaining_val = max(0.0, float(goal.target_amount - goal.current_amount))
    remaining_amount = f"{currency_symbol}{remaining_val:.2f}"
    pct = round((goal.current_amount / goal.target_amount) * 100, 1) if goal.target_amount > 0 else 100.0
    cta_url = f"{FRONTEND_BASE_URL}/goals"

    if milestone_type == "100":
        subject = f"BudgetBuddy – Savings Goal Update (Goal Achieved: {goal_name}!)"
        badge_text = "Goal Achieved"
        badge_type = "success"
        headline = f"Congratulations! You reached 100% of '{goal_name}'!"
    else:
        subject = f"BudgetBuddy – Savings Goal Update (Halfway There: {goal_name})"
        badge_text = "50% Milestone"
        badge_type = "info"
        headline = f"Halfway There: 50% Milestone Reached for '{goal_name}'"

    plain_text = (
        f"Hello {user_name},\n\n"
        f"Here is an update regarding your savings goal.\n\n"
        f"SAVINGS DETAILS\n\n"
        f"Goal Name: {goal_name}\n"
        f"Target Amount: {target_amount}\n"
        f"Current Savings: {current_amount}\n"
        f"Remaining Amount: {remaining_amount}\n"
        f"Progress: {pct}%\n\n"
        f"Keep working towards your financial goals: {cta_url}\n\n"
        f"Button: View Savings Goals"
    )

    details = {
        "Goal Name": goal_name,
        "Target Amount": target_amount,
        "Current Savings": current_amount,
        "Remaining Amount": remaining_amount,
        "Progress": f"{pct}%",
    }
    if goal.target_date:
        details["Target Date"] = str(goal.target_date)

    html = render_budgetbuddy_email(
        title="BudgetBuddy – Savings Goal Update",
        badge_text=badge_text,
        badge_type=badge_type,
        headline=headline,
        greeting=f"Hello {user_name},",
        body_paragraphs=[
            "Here is an update regarding your savings goal.",
        ],
        section_title="SAVINGS DETAILS",
        details=details,
        outro_paragraphs=[
            "Keep working towards your financial goals! Consistent contributions build long-term financial security.",
        ],
        cta_text="View Savings Goals",
        cta_url=cta_url,
    )
    return subject, plain_text, html


# ─── CORE EMAIL DISPATCHER ───
def send_notification_email(recipient_email, subject, message, html_message=None, user=None):
    """
    Sends an email using Django's configured EMAIL_BACKEND.
    In testing: automatically captured by django.core.mail.outbox.
    In development: console backend logs to terminal.
    In production: SMTP / Brevo relay.
    Returns (success: bool, error_detail: str).
    """
    if not recipient_email or not str(recipient_email).strip():
        return False, "Recipient email address is required."

    if not subject or not str(subject).strip():
        return False, "Email subject is required."

    if not message or not str(message).strip():
        return False, "Email message content cannot be empty."

    cleaned_email = str(recipient_email).strip().lower()
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None)
    host_user = getattr(settings, 'EMAIL_HOST_USER', None)
    if (not from_email or 'noreply@budgetbuddy.app' in str(from_email)) and host_user and '@' in str(host_user):
        from_email = f"BudgetBuddy <{host_user}>"
    if not from_email:
        from_email = 'BudgetBuddy <noreply@budgetbuddy.app>'

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[cleaned_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Notification email '{subject}' sent to {cleaned_email} (user: {user.username if user else 'N/A'})")
        return True, ""
    except Exception as e:
        err_msg = str(e)
        logger.error(f"Failed to send notification email to {cleaned_email}: {err_msg}")
        return False, err_msg


