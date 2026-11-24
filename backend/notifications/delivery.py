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
