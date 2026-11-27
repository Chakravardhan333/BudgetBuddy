import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from datetime import datetime, timezone
from django.conf import settings
from django.db import connection

@api_view(['GET', 'HEAD'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Public health check endpoint returning server status, environment,
    database connectivity, system time, and API version.
    Supports both GET and HEAD requests for uptime monitors and pre-warming pings.
    """
    if request.method == 'HEAD':
        return Response(status=200)

    # Dynamically determine deployment environment
    env = os.environ.get('ENVIRONMENT')
    if not env:
        env = 'development' if settings.DEBUG else 'production'

    # Check database connectivity safely without exposing credentials
    db_status = "connected"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
    except Exception as e:
        db_status = f"unreachable ({type(e).__name__})"

    engine = connection.settings_dict.get('ENGINE', '')
    if 'postgresql' in engine:
        db_engine = "postgresql"
    elif 'sqlite' in engine:
        db_engine = "sqlite"
    else:
        db_engine = "custom"

    # Check Redis / Celery broker connectivity
    redis_url = os.environ.get('CELERY_BROKER_URL') or os.environ.get('REDIS_URL')
    if redis_url and not redis_url.startswith('redis://localhost'):
        try:
            import redis
            r = redis.from_url(redis_url, socket_connect_timeout=2)
            r.ping()
            redis_status = "connected"
        except Exception as e:
            redis_status = f"unreachable ({type(e).__name__})"
    elif redis_url:
        redis_status = "local_default"
    else:
        redis_status = "not_configured"

    # Brevo configuration status
    has_brevo = bool(
        (os.environ.get("BREVO_API_KEY", "").strip() or os.environ.get("BREVO_SMTP_KEY", "").strip())
        and (os.environ.get("BREVO_SENDER_EMAIL", "").strip() or os.environ.get("EMAIL_HOST_USER", "").strip())
    )
    brevo_status = "configured" if has_brevo else "not_configured"

    overall_status = "healthy" if db_status == "connected" else "degraded"

    return Response({
        "status": overall_status,
        "app": "BudgetBuddy API",
        "version": "1.0.0",
        "environment": env,
        "database": db_status,
        "database_engine": db_engine,
        "redis_broker": redis_status,
        "brevo_email": brevo_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

