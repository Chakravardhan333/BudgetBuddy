"""Brevo transactional email delivery over HTTPS (port 443)."""
import json
import logging
from email.utils import parseaddr
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)
BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email"


def send_brevo_email(*, subject, message, recipient, from_email=None):
    """Send a plain-text transactional email through Brevo's HTTPS API."""
    api_key = getattr(settings, "BREVO_API_KEY", "").strip()
    if not api_key:
        logger.error("Brevo email skipped: BREVO_API_KEY is not configured.")
        return False

    sender_name, sender_email = parseaddr(from_email or settings.DEFAULT_FROM_EMAIL)
    if not sender_email or "@" not in sender_email:
        logger.error("Brevo email skipped: DEFAULT_FROM_EMAIL is not a valid sender address.")
        return False

    payload = {
        "sender": {"name": sender_name or "BudgetBuddy", "email": sender_email},
        "to": [{"email": recipient}],
        "subject": subject,
        "textContent": message,
    }
    request = Request(
        BREVO_EMAIL_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "accept": "application/json",
            "api-key": api_key,
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=12) as response:
            if response.status in (200, 201, 202):
                logger.info("Brevo accepted email for recipient %s.", recipient)
                return True
            logger.error("Brevo returned unexpected HTTP status %s.", response.status)
            return False
    except HTTPError as exc:
        # Log provider response for diagnosis; never log request headers or API key.
        detail = exc.read(1000).decode("utf-8", errors="replace")
        logger.error("Brevo API rejected email (HTTP %s): %s", exc.code, detail)
    except (URLError, TimeoutError, OSError) as exc:
        logger.error("Brevo HTTPS email request failed: %s", exc)
    except Exception:
        logger.exception("Unexpected Brevo email delivery error.")
    return False
