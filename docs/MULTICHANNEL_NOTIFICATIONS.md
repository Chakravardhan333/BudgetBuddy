# BudgetBuddy multichannel notification setup

## Brevo email test

The authenticated endpoint `POST /api/notifications/email/test/` sends a single test email to the signed-in user's own account email. It requires these Render environment variables:

- `EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend`
- `EMAIL_HOST=smtp-relay.brevo.com`
- `EMAIL_PORT=587`
- `EMAIL_USE_TLS=True`
- `EMAIL_HOST_USER=<Brevo SMTP login>`
- `EMAIL_HOST_PASSWORD=<Brevo SMTP key>`
- `DEFAULT_FROM_EMAIL=<verified sender address>`

The endpoint never accepts an arbitrary recipient address and never returns SMTP credentials.

## MSG91 SMS test

The authenticated endpoint `POST /api/notifications/sms/test/` sends one test SMS to the phone number saved in the caller's BudgetBuddy profile. The caller must explicitly submit `{"confirm_consent": true}`. It requires:

- `MSG91_AUTH_KEY=<MSG91 auth key>`
- `MSG91_TEMPLATE_ID=<approved MSG91 Flow/DLT template ID>`
- `MSG91_COUNTRY_CODE=91` (optional; defaults to India)

The approved MSG91 template must contain variables corresponding to `var1` and `var2`. Indian SMS delivery also requires the appropriate DLT entity, sender header, and approved template configuration. Do not send SMS to users who have not opted in. This test endpoint is not a recurring reminder subscription.

## Important deployment note

A successful Render Web Service deployment alone does not run Celery. Scheduled reminders require a reachable Redis broker and separate Celery worker and Celery Beat processes. Do not add these processes until the Redis service and start commands are configured.
