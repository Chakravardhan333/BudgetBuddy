import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../api/finance';
import { ArrowLeftRight, Search, Download, Filter, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function TransactionsPage() {
  const { user } = useAuth();
  const symbol = user?.currency_symbol || '$';

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all | expense | income
  const [search, setSearch] = useState('');

  const loadAllTransactions = async () => {
    try {
      setLoading(true);
      const [expenses, incomes] = await Promise.all([
        financeService.getExpenses(),
        financeService.getIncome(),
      ]);

      const formattedExpenses = expenses.map((e) => ({
        id: `exp-${e.id}`,
        type: 'expense',
        description: e.description,
        category: e.category_name,
        date: e.date,
        amount: parseFloat(e.amount),
        method: e.payment_method,
      }));

      const formattedIncomes = incomes.map((i) => ({
        id: `inc-${i.id}`,
        type: 'income',
        description: i.description,
        category: i.source.replace('_', ' '),
        date: i.date,
        amount: parseFloat(i.amount),
        method: 'Inflow',
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

  useEffect(() => {
    loadAllTransactions();
  }, []);

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            Transaction History
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Complete chronological database ledger of all debits and credits.
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Activity
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === 'expense'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Expenses Only
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === 'income'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Income Only
          </button>
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
                    <td className="py-3.5 px-4 text-slate-500">{t.date}</td>
                    <td className="py-3.5 px-4 text-slate-500 capitalize">{t.method}</td>
                    <td className={`py-3.5 px-4 text-right font-bold ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{symbol}{t.amount.toFixed(2)}
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
