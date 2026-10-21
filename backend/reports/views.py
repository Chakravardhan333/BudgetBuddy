from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework import permissions
from datetime import datetime
from .services import generate_pdf_report, generate_excel_report

class ExportPdfView(APIView):
    """
    GET /api/reports/pdf/?year=...&month=...&timezone=...
    Streams a formatted PDF financial statement.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        tz_str = request.query_params.get('timezone', 'Asia/Kolkata')

        year_int = int(year) if year and year.isdigit() else None
        month_int = int(month) if month and month.isdigit() else None

        pdf_bytes = generate_pdf_report(user, year=year_int, month=month_int, timezone_str=tz_str)

        filename = f"BudgetBuddy_Statement_{user.username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response


class ExportExcelView(APIView):
    """
    GET /api/reports/excel/?year=...&month=...&timezone=...
    Streams a formatted multi-sheet Excel spreadsheet.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        tz_str = request.query_params.get('timezone', 'Asia/Kolkata')

        year_int = int(year) if year and year.isdigit() else None
        month_int = int(month) if month and month.isdigit() else None

        excel_bytes = generate_excel_report(user, year=year_int, month=month_int, timezone_str=tz_str)

        filename = f"BudgetBuddy_Ledger_{user.username}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response
