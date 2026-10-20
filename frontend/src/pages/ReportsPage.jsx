import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { reportsService } from '../api/reports';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShieldCheck,
  CreditCard
} from 'lucide-react';

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('current_month'); // all | current_month | current_year
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const getParams = () => {
    const today = new Date();
    if (period === 'current_month') {
      return { month: today.getMonth() + 1, year: today.getFullYear() };
    }
    if (period === 'current_year') {
      return { year: today.getFullYear() };
    }
    return {};
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setError('');
    setSuccess('');
    try {
      await reportsService.downloadPdf(getParams());
      setSuccess("PDF statement generated and downloaded successfully.");
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError("Failed to generate PDF statement. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    setError('');
    setSuccess('');
    try {
      await reportsService.downloadExcel(getParams());
      setSuccess("Excel workbook generated and downloaded successfully.");
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError("Failed to generate Excel ledger. Please try again.");
    } finally {
      setDownloadingExcel(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
          Financial Statements & Exports
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Export tax-ready, official statements directly in formatted PDF and multi-tab Excel XLSX workbooks.
        </p>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Period Selection Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Statement Scope & Period:</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setPeriod('current_month')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              period === 'current_month'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Current Month
          </button>
          <button
            onClick={() => setPeriod('current_year')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              period === 'current_year'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Current Year
          </button>
          <button
            onClick={() => setPeriod('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              period === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Complete History
          </button>
        </div>
      </div>

      {/* Download Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">PDF Financial Statement</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Official formatted statement with executive summaries, category-wise expenditure tables, budget utilization performance, savings targets, and a general debit/credit ledger.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Executive inflow, outflow, and net cash surplus</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Monthly budget utilization & cap performance</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Category percentage breakdowns & savings milestones</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Compiling Statement...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download PDF Statement</span>
              </>
            )}
          </button>
        </div>

        {/* Excel Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Excel XLSX Multi-Tab Ledger</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Complete multi-sheet workbook with dedicated tabs for Executive Summary, Expenses, Income, Category Aggregates, Savings Goals, and Budget Summary.
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Includes formatted numeric currency cells</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Auto-adjusted column widths and navy header bands</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Compatible with Microsoft Excel, Google Sheets, and LibreOffice</span>
              </li>
            </ul>
          </div>

          <button
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs"
          >
            {downloadingExcel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Workbook...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download Excel Ledger (.xlsx)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
