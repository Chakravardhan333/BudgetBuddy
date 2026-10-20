from django.urls import path
from .views import ExportPdfView, ExportExcelView

urlpatterns = [
    path('pdf/', ExportPdfView.as_view(), name='export_pdf'),
    path('excel/', ExportExcelView.as_view(), name='export_excel'),
]
