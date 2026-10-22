import os
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from datetime import datetime, timezone
from django.conf import settings
from django.db import connection

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Public health check endpoint returning server status, environment,
    database connectivity, system time, and API version.
    """
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

    overall_status = "healthy" if db_status == "connected" else "degraded"

    return Response({
        "status": overall_status,
        "app": "BudgetBuddy API",
        "version": "1.0.0",
        "environment": env,
        "database": db_status,
        "database_engine": db_engine,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

