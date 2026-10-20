import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../api/finance';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  PieChart,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Target,
  FileSpreadsheet,
  AlertTriangle,
  CreditCard,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    balance: 0.0,
    monthly_income: 0.0,
    monthly_expenses: 0.0,
    monthly_savings: 0.0,
    budget_limit: 0.0,
    budget_used_percent: 0.0,
    category_breakdown: [],
    recent_transactions: [],
    currency: user?.currency || 'USD',
    currency_symbol: user?.currency_symbol || '$',
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await financeService.getDashboardSummary();
      setData(res);
    } catch (err) {
      console.error("Failed to load live dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const symbol = data.currency_symbol || user?.currency_symbol || '$';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner Greeting */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-700/60 shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Personal Finance Command Center
            </span>
            <span className="text-xs text-slate-400 capitalize">
              Account: <strong className="text-slate-200">{user?.role}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.first_name || user?.username}!
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Here is your financial status overview in <span className="font-semibold text-emerald-400">{user?.currency || 'USD'}</span>. All records are backed by your personal database ledger.
          </p>
        </div>

        {/* Action Shortcut Buttons */}
        <div className="flex flex-wrap gap-2.5">
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Current Net Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Current Balance</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${data.balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              {symbol}{data.balance.toFixed(2)}
            </div>
            <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Net Liquidity Available</span>
            </div>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Income</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-600">
              {symbol}{data.monthly_income.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Current month cash inflows
            </div>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Monthly Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-600">
              {symbol}{data.monthly_expenses.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Current month total outlay
            </div>
          </div>
        </div>

        {/* Savings Stash */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Savings Stash</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {symbol}{data.monthly_savings.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Active milestone balances
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Budget Utilization Bar */}
      {data.budget_limit > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-purple-600" />
              <h2 className="text-sm font-bold text-slate-800">Monthly Budget Utilization</h2>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {symbol}{data.monthly_expenses.toFixed(2)} of {symbol}{data.budget_limit.toFixed(2)} ({data.budget_used_percent}%)
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
              style={{ width: `${Math.min(data.budget_used_percent, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Remaining cushion: {symbol}{Math.max(0, data.budget_limit - data.monthly_expenses).toFixed(2)}</span>
            {data.budget_used_percent > 80 && (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> High utilization threshold
              </span>
            )}
          </div>
        </div>
      )}

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
            <div className="p-10 text-center text-slate-400 text-xs">
              No transactions recorded yet. Click "Record Expense" or "Record Income" to get started!
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
                        {t.date}
                      </td>
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
            <div className="p-6 text-center text-slate-400 text-xs">
              No category expenses recorded this month.
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {data.category_breakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{cat.category}</span>
                    <span className="font-bold text-slate-900">{symbol}{cat.amount.toFixed(2)}</span>
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
