from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from datetime import datetime, timezone

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Public health check endpoint returning server status, system time, and API version.
    """
    return Response({
        "status": "healthy",
        "app": "BudgetBuddy API",
        "version": "1.0.0",
        "environment": "development",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
