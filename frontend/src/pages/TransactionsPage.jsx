import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../api/finance';
import { useRealTimePolling } from '../hooks/useRealTimePolling';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowLeftRight,
  Search,
  Download,
  Filter,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const symbol = user?.currency_symbol || '$';
  const currencyCode = user?.currency || 'USD';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all | expense | income
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadAllTransactions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [expenses, incomes] = await Promise.all([
        financeService.getExpenses(params),
        financeService.getIncome(params),
      ]);

      const formattedExpenses = expenses.map((e) => ({
        id: `exp-${e.id}`,
        rawId: e.id,
        type: 'expense',
        description: e.description,
        category: e.category_name,
        date: e.date,
        amount: parseFloat(e.amount),
        method: e.payment_method || 'card',
        notes: e.notes,
      }));

      const formattedIncomes = incomes.map((i) => ({
        id: `inc-${i.id}`,
        rawId: i.id,
        type: 'income',
        description: i.description,
        category: i.source ? i.source.replace('_', ' ') : 'Income',
        date: i.date,
        amount: parseFloat(i.amount),
        method: 'Inflow',
        notes: i.notes,
      }));

      const combined = [...formattedExpenses, ...formattedIncomes];
      combined.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(combined);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  useRealTimePolling(loadAllTransactions, 20000, [startDate, endDate]);

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalInflow = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netFlow = totalInflow - totalOutflow;

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            Transaction History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete chronological ledger of all debits and credits from real backend data.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition-colors shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Print / Export Ledger</span>
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Selected Inflows</span>
            <div className="text-lg font-bold text-emerald-600">+{formatCurrency(totalInflow, currencyCode)}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Selected Outflows</span>
            <div className="text-lg font-bold text-rose-600">-{formatCurrency(totalOutflow, currencyCode)}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase text-slate-400">Net Period Position</span>
            <div className={`text-lg font-bold ${netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(netFlow, currencyCode)}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by note or description..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-[11px] text-slate-400">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <span className="text-[11px] text-slate-400">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('expense')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterType === 'expense'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Expenses
              </button>
              <button
                onClick={() => setFilterType('income')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  filterType === 'income'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Income
              </button>
            </div>

            {(search || filterType !== 'all' || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Unified General Ledger</h2>
          <span className="text-xs text-slate-400">{filtered.length} entries shown</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span>Loading ledger from database...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No transactions match the selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Transaction</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category / Source</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {t.description}
                      {t.notes && <div className="text-[11px] text-slate-400 font-normal mt-0.5">{t.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase tracking-wider ${
                        t.type === 'income'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {t.type === 'income' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium capitalize">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(t.date)}</td>
                    <td className="py-3.5 px-4 text-slate-500 capitalize">{t.method}</td>
                    <td className={`py-3.5 px-4 text-right font-bold ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
