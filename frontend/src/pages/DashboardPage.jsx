import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../api/finance';
import { useRealTimePolling } from '../hooks/useRealTimePolling';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';
import {
  Wallet,
  PiggyBank,
  PieChart,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ChevronRight,
  Target,
  FileSpreadsheet,
  AlertTriangle,
  RotateCw,
  Calendar
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('this_month'); // today | this_week | this_month | this_year | lifetime

  const [data, setData] = useState({
    balance: 0.0,
    total_income: 0.0,
    total_expenses: 0.0,
    monthly_income: 0.0,
    monthly_expenses: 0.0,
    monthly_savings: 0.0,
    savings_rate: 0.0,
    budget_limit: 0.0,
    budget_used_percent: 0.0,
    savings_goal_progress: 0.0,
    total_goal_target: 0.0,
    total_goal_saved: 0.0,
    timeframe_summaries: {
      today: { income: 0, expenses: 0, balance: 0 },
      this_week: { income: 0, expenses: 0, balance: 0 },
      this_month: { income: 0, expenses: 0, balance: 0 },
      this_year: { income: 0, expenses: 0, balance: 0 },
    },
    category_breakdown: [],
    recent_transactions: [],
    currency: user?.currency || 'USD',
    currency_symbol: user?.currency_symbol || '$',
  });

  const fetchDashboardData = async () => {
    try {
      const res = await financeService.getDashboardSummary();
      setData(res);
    } catch (err) {
      console.error("Failed to load live dashboard metrics:", err);
    }
  };

  // Visibility-aware polling every 20s, pauses on hidden tab, refetches on finance mutations
  const { lastUpdated, refetch } = useRealTimePolling(fetchDashboardData, 20000);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  const symbol = data.currency_symbol || user?.currency_symbol || '$';
  const currencyCode = user?.currency || 'USD';

  // Compute selected timeframe stats
  let selectedIncome = data.monthly_income;
  let selectedExpense = data.monthly_expenses;
  let selectedBalance = data.balance;
  let timeframeLabel = "Current Month";

  if (timeframe === 'today' && data.timeframe_summaries?.today) {
    selectedIncome = data.timeframe_summaries.today.income;
    selectedExpense = data.timeframe_summaries.today.expenses;
    selectedBalance = data.timeframe_summaries.today.balance;
    timeframeLabel = "Today";
  } else if (timeframe === 'this_week' && data.timeframe_summaries?.this_week) {
    selectedIncome = data.timeframe_summaries.this_week.income;
    selectedExpense = data.timeframe_summaries.this_week.expenses;
    selectedBalance = data.timeframe_summaries.this_week.balance;
    timeframeLabel = "This Week";
  } else if (timeframe === 'this_year' && data.timeframe_summaries?.this_year) {
    selectedIncome = data.timeframe_summaries.this_year.income;
    selectedExpense = data.timeframe_summaries.this_year.expenses;
    selectedBalance = data.timeframe_summaries.this_year.balance;
    timeframeLabel = "This Year";
  } else if (timeframe === 'lifetime') {
    selectedIncome = data.total_income;
    selectedExpense = data.total_expenses;
    selectedBalance = data.balance;
    timeframeLabel = "Lifetime (All Records)";
  }

  const periodSavingsRate = selectedIncome > 0
    ? Math.max(0, ((selectedIncome - selectedExpense) / selectedIncome) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner Greeting & Live Synchronization Status */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-700/60 shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Personal Finance Command Center
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>Live Ledger Active</span>
            </div>
            <span className="text-xs text-slate-400">
              Tier: <strong className="text-slate-200 capitalize">{user?.role || 'student'}</strong>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.first_name || user?.username}!
          </h1>

          <div className="flex flex-wrap items-center gap-2 text-slate-300 text-xs">
            <span>Operating Currency: <strong className="text-emerald-400 font-semibold">{user?.currency || 'USD'} ({symbol})</strong></span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3 h-3 text-slate-400" />
              Synced: {formatDateTime(lastUpdated)}
            </span>
          </div>
        </div>

        {/* Action Shortcut Buttons & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
            title="Force refresh live metrics"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <NavLink
            to="/expenses"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Expense</span>
          </NavLink>

          <NavLink
            to="/income"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Income</span>
          </NavLink>
        </div>
      </div>

      {/* Timeframe Scope Filter Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Accounting Period:</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'today', label: 'Today' },
            { id: 'this_week', label: 'This Week' },
            { id: 'this_month', label: 'This Month' },
            { id: 'this_year', label: 'This Year' },
            { id: 'lifetime', label: 'Lifetime' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setTimeframe(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                timeframe === pill.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Net Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {timeframe === 'lifetime' ? 'Lifetime Net Balance' : `${timeframeLabel} Balance`}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${selectedBalance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {formatCurrency(selectedBalance, symbol, currencyCode)}
            </div>
            <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Net Liquidity (Inflow - Outflow)</span>
            </div>
          </div>
        </div>

        {/* Total / Period Income */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">{timeframeLabel} Income</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(selectedIncome, symbol, currencyCode)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Inflows logged in {timeframeLabel.toLowerCase()}
            </div>
          </div>
        </div>

        {/* Total / Period Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">{timeframeLabel} Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600">
              {formatCurrency(selectedExpense, symbol, currencyCode)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Debits logged in {timeframeLabel.toLowerCase()}
            </div>
          </div>
        </div>

        {/* Savings Rate & Stash */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Savings Stash & Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(data.monthly_savings, symbol, currencyCode)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-600">{periodSavingsRate}% saved</span>
              <span>of period income</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Budget & Goals Dual Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Monthly Budget Utilization Bar */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-800">Monthly Budget Usage</h2>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {data.budget_limit > 0 ? (
                <>
                  {formatCurrency(data.monthly_expenses, symbol, currencyCode)} of {formatCurrency(data.budget_limit, symbol, currencyCode)} ({data.budget_used_percent}%)
                </>
              ) : (
                <span className="text-slate-400">No monthly cap set</span>
              )}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                data.budget_used_percent > 100
                  ? 'bg-rose-500'
                  : data.budget_used_percent > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(data.budget_used_percent || 0, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500">
            {data.budget_limit > 0 ? (
              <span>Cushion: {formatCurrency(Math.max(0, data.budget_limit - data.monthly_expenses), symbol, currencyCode)}</span>
            ) : (
              <NavLink to="/budgets" className="text-emerald-600 hover:underline">
                Establish monthly budget &rarr;
              </NavLink>
            )}

            {data.budget_used_percent > 80 && (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> High threshold warning
              </span>
            )}
          </div>
        </div>

        {/* Savings Goals Aggregate Progress */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">Savings Goals Accumulation</h2>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {data.total_goal_target > 0 ? (
                <>
                  {formatCurrency(data.total_goal_saved, symbol, currencyCode)} of {formatCurrency(data.total_goal_target, symbol, currencyCode)} ({data.savings_goal_progress}%)
                </>
              ) : (
                <span className="text-slate-400">No active goals</span>
              )}
            </span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(data.savings_goal_progress || 0, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Overall completion across financial milestones</span>
            <NavLink to="/goals" className="text-blue-600 hover:underline">
              Manage goals &rarr;
            </NavLink>
          </div>
        </div>
      </div>

      {/* Main Two-Column Activity & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Recent Transactions
            </h2>
            <NavLink
              to="/transactions"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </NavLink>
          </div>

          {data.recent_transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700">No transactions recorded yet</p>
              <p className="text-xs text-slate-400">
                Click "Record Expense" or "Record Income" above to begin building your financial history.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Category / Source</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.recent_transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {t.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {formatDate(t.date)}
                      </td>
                      <td className={`py-3.5 px-4 text-right font-bold ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, symbol, currencyCode)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Col: Category Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-600" />
              Category Outlays
            </h2>
            <NavLink to="/expenses" className="text-xs text-slate-400 hover:text-slate-600">
              Details
            </NavLink>
          </div>

          {data.category_breakdown.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1 text-xs">
              <p className="font-medium text-slate-600">No category expenses this month</p>
              <p className="text-slate-400">Expenses logged will be grouped and visualized here automatically.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {data.category_breakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.category}</span>
                    <span className="font-bold text-slate-900">{formatCurrency(cat.amount, symbol, currencyCode)}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full"
                      style={{
                        width: `${Math.min(
                          (cat.amount / Math.max(1, data.monthly_expenses)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <NavLink
              to="/reports"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Export Monthly Statements</span>
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
