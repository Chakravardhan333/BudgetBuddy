"""Provider adapters for BudgetBuddy outbound notifications.

Secrets are read only from the deployment environment. Never place provider
credentials in source control or return them from API endpoints.
"""
import json
import logging
import os
import re
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

logger = logging.getLogger(__name__)


def send_msg91_test_sms(phone_number):
    """Send a one-off test SMS using an MSG91 Flow/DLT template.

    The MSG91 template must be approved and its variables must match var1/var2.
    This function is called only by an authenticated, explicitly confirmed
    test endpoint; it is not an automatic reminder subscription.
    """
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip()
    template_id = os.environ.get("MSG91_TEMPLATE_ID", "").strip()
    country_code = re.sub(r"\D", "", os.environ.get("MSG91_COUNTRY_CODE", "91"))
    if not auth_key or not template_id:
        return {
            "success": False,
            "message": "MSG91 is not configured. Add MSG91_AUTH_KEY and MSG91_TEMPLATE_ID in Render.",
        }

    digits = re.sub(r"\D", "", phone_number)
    if digits.startswith("0"):
        digits = digits.lstrip("0")
    if country_code and not digits.startswith(country_code):
        digits = country_code + digits
    if len(digits) < 10 or len(digits) > 15:
        return {"success": False, "message": "The saved phone number is not valid for SMS delivery."}

    payload = {
        "template_id": template_id,
        "short_url": "0",
        "recipients": [{
            "mobiles": digits,
            "var1": "BudgetBuddy test",
            "var2": "Your SMS notification connection is working.",
        }],
    }
    request = Request(
        "https://control.msg91.com/api/v5/flow/",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "authkey": auth_key,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            response_body = response.read().decode("utf-8", errors="replace")
            provider_data = json.loads(response_body) if response_body else {}
            status_text = str(provider_data.get("type", "")).lower()
            accepted = 200 <= response.status < 300 and status_text not in {"error", "failure"}
            if accepted:
                return {"success": True, "message": "MSG91 accepted the test SMS request."}
            logger.warning("MSG91 rejected test SMS: provider_type=%s", status_text)
            return {"success": False, "message": "MSG91 did not accept the test SMS request."}
    except HTTPError as exc:
        logger.warning("MSG91 HTTP error during test SMS: status=%s", exc.code)
    except (URLError, TimeoutError, ValueError) as exc:
        logger.warning("MSG91 request failed during test SMS: %s", type(exc).__name__)
    except Exception:
        logger.exception("Unexpected MSG91 test SMS error")
    return {"success": False, "message": "Could not send the test SMS. Check MSG91 configuration and server logs."}



def send_msg91_reminder_sms(phone_number, title, message):
    """Send one opted-in reminder SMS using the configured approved MSG91 Flow template."""
    auth_key = os.environ.get("MSG91_AUTH_KEY", "").strip()
    template_id = os.environ.get("MSG91_TEMPLATE_ID", "").strip()
    country_code = re.sub(r"\D", "", os.environ.get("MSG91_COUNTRY_CODE", "91"))
    if not auth_key or not template_id:
        return False
    digits = re.sub(r"\D", "", phone_number or "")
    if digits.startswith("0"):
        digits = digits.lstrip("0")
    if country_code and not digits.startswith(country_code):
        digits = country_code + digits
    if len(digits) < 10 or len(digits) > 15:
        return False
    payload = {
        "template_id": template_id,
        "short_url": "0",
        "recipients": [{
            "mobiles": digits,
            "var1": str(title)[:60],
            "var2": str(message or "Your BudgetBuddy reminder is due.")[:120],
        }],
    }
    request = Request(
        "https://control.msg91.com/api/v5/flow/",
        data=json.dumps(payload).encode("utf-8"),
        headers={"accept": "application/json", "content-type": "application/json", "authkey": auth_key},
        method="POST",
    )
    try:
        with urlopen(request, timeout=15) as response:
            data = response.read().decode("utf-8", errors="replace")
            result = json.loads(data) if data else {}
            return 200 <= response.status < 300 and str(result.get("type", "")).lower() not in {"error", "failure"}
    except Exception as exc:
        logger.warning("MSG91 reminder delivery failed: %s", type(exc).__name__)
        return False



def brevo_email_ready():
    """Return whether the HTTPS-based Brevo API sender is configured."""
    return bool(os.environ.get("BREVO_API_KEY", "").strip() and os.environ.get("BREVO_SENDER_EMAIL", "").strip())


def send_brevo_email(to_email, subject, text_content, html_content=None):
    """Send transactional email through Brevo's HTTPS API (works on Render Free)."""
    api_key = os.environ.get("BREVO_API_KEY", "").strip()
    sender_email = os.environ.get("BREVO_SENDER_EMAIL", "").strip()
    sender_name = os.environ.get("BREVO_SENDER_NAME", "BudgetBuddy").strip() or "BudgetBuddy"
    if not api_key or not sender_email:
        return {"success": False, "message": "Brevo API is not configured. Add BREVO_API_KEY and BREVO_SENDER_EMAIL in Render."}

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text_content,
    }
    if html_content:
        payload["htmlContent"] = html_content

    request = Request(
        "https://api.brevo.com/v3/smtp/email",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=20) as response:
            response_body = response.read().decode("utf-8", errors="replace")
            provider_data = json.loads(response_body) if response_body else {}
            if 200 <= response.status < 300 and provider_data.get("messageId"):
                return {"success": True, "message_id": provider_data["messageId"]}
            logger.warning("Brevo API did not confirm email acceptance (HTTP %s).", response.status)
            return {"success": False, "message": "Brevo did not confirm acceptance of the email."}
    except HTTPError as exc:
        try:
            provider_error = exc.read().decode("utf-8", errors="replace")[:1000]
        except Exception:
            provider_error = ""
        logger.warning("Brevo API rejected email (HTTP %s): %s", exc.code, provider_error)
        return {"success": False, "message": "Brevo rejected the email. Check the sender verification, API key, and transactional email status in Brevo."}
    except (URLError, TimeoutError) as exc:
        logger.warning("Brevo API connection failed: %s", type(exc).__name__)
        return {"success": False, "message": "Could not connect to Brevo over HTTPS. Check Render network access and try again."}
    except Exception:
        logger.exception("Unexpected Brevo email delivery error.")
        return {"success": False, "message": "Unexpected error while sending email through Brevo."}


def build_budgetbuddy_email_html(title, message, category="system", cta_url="/dashboard", cta_label="Open BudgetBuddy"):
    """Build a responsive, email-client-friendly BudgetBuddy notification email."""
    from html import escape

    palette = {
        "budgets": ("#b45309", "#fff7ed", "BUDGET ALERT"),
        "expenses": ("#2563eb", "#eff6ff", "EXPENSE UPDATE"),
        "payments": ("#047857", "#ecfdf5", "SAVINGS & PAYMENTS"),
        "reminders": ("#7c3aed", "#f5f3ff", "REMINDER"),
        "system": ("#334155", "#f1f5f9", "ACCOUNT UPDATE"),
    }
    accent, tint, label = palette.get(category, palette["system"])
    safe_title = escape(str(title or "Your financial update"))
    safe_message = escape(str(message or "")).replace("\n", "<br>")
    frontend_url = os.environ.get("FRONTEND_URL", "https://budget-buddy-sigma-two.vercel.app").rstrip("/")
    safe_url = escape(frontend_url + (cta_url if str(cta_url).startswith("/") else "/dashboard"), quote=True)
    safe_cta = escape(str(cta_label))
    html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #e5eaf1;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:24px 28px;background:#101827;color:#ffffff;">
        <div style="font-size:20px;font-weight:700;letter-spacing:.2px;">BudgetBuddy</div>
        <div style="margin-top:6px;color:#cbd5e1;font-size:12px;">SMARTER MONEY. CLEARER DECISIONS.</div>
      </td></tr>
      <tr><td style="padding:30px 28px 12px;">
        <span style="display:inline-block;padding:7px 10px;border-radius:999px;background:__TINT__;color:__ACCENT__;font-size:11px;font-weight:700;letter-spacing:.6px;">__LABEL__</span>
        <h1 style="margin:18px 0 12px;font-size:25px;line-height:1.25;color:#111827;">__TITLE__</h1>
        <div style="padding:18px 20px;background:#f8fafc;border:1px solid #e8edf4;border-left:4px solid __ACCENT__;border-radius:10px;font-size:15px;line-height:1.7;color:#334155;">__MESSAGE__</div>
        <p style="margin:22px 0 26px;font-size:14px;line-height:1.6;color:#64748b;">Open your BudgetBuddy dashboard to review the details and take action.</p>
        <a href="__URL__" style="display:inline-block;padding:13px 20px;background:__ACCENT__;color:#ffffff;text-decoration:none;border-radius:9px;font-size:14px;font-weight:700;">__CTA__</a>
      </td></tr>
      <tr><td style="padding:22px 28px 26px;border-top:1px solid #edf1f5;color:#94a3b8;font-size:11px;line-height:1.6;">
        You received this email because notifications are enabled for your BudgetBuddy account.<br>
        BudgetBuddy · Manage your money. Build your future.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""
    return (html.replace("__TINT__", tint).replace("__ACCENT__", accent)
            .replace("__LABEL__", label).replace("__TITLE__", safe_title)
            .replace("__MESSAGE__", safe_message).replace("__URL__", safe_url)
            .replace("__CTA__", safe_cta))


def send_notification_email(notification):
    """Send a newly-created in-app notification as a branded transactional email."""
    user = notification.user
    recipient = (getattr(user, "email", "") or "").strip()
    if not recipient or not brevo_email_ready():
        return {"success": False, "message": "No recipient email or Brevo configuration is available."}

    category = getattr(notification, "category", "system")
    link = getattr(notification, "link", None) or "/dashboard"
    html_content = build_budgetbuddy_email_html(
        title=notification.title,
        message=notification.message,
        category=category,
        cta_url=link,
    )
    frontend_url = os.environ.get("FRONTEND_URL", "https://budget-buddy-sigma-two.vercel.app").rstrip("/")
    return send_brevo_email(
        to_email=recipient,
        subject=f"BudgetBuddy: {notification.title}",
        text_content=f"{notification.title}\n\n{notification.message}\n\nOpen BudgetBuddy: {frontend_url}{link}",
        html_content=html_content,
    )
