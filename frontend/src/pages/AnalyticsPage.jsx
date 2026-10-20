import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../api/finance';
import { BarChart3, TrendingUp, TrendingDown, PieChart as PieIcon, Loader2 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const symbol = user?.currency_symbol || '$';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await financeService.getDashboardSummary();
        setSummary(data);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading || !summary) {
    return (
      <div className="p-16 text-center text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
        <span>Computing real financial analytics from database...</span>
      </div>
    );
  }

  const comparisonData = [
    {
      name: 'Monthly Overview',
      Income: summary.monthly_income,
      Expenses: summary.monthly_expenses,
    },
  ];

  const pieColors = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#64748b'];

  const categoryData = summary.category_breakdown.map((item, idx) => ({
    name: item.category,
    value: item.amount,
    color: pieColors[idx % pieColors.length],
  }));

  const savingsRate = summary.monthly_income > 0
    ? Math.max(0, ((summary.monthly_income - summary.monthly_expenses) / summary.monthly_income) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-cyan-600" />
          Financial Analytics
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Interactive charts and ratio analysis computed directly from your transaction ledger.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase">Monthly Savings Rate</span>
          <div className="text-3xl font-extrabold text-emerald-600">{savingsRate}%</div>
          <p className="text-xs text-slate-400">Share of monthly income saved</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase">Cash Flow Ratio</span>
          <div className="text-3xl font-extrabold text-slate-900">
            {summary.monthly_expenses > 0 ? (summary.monthly_income / summary.monthly_expenses).toFixed(2) : '1.0'}x
          </div>
          <p className="text-xs text-slate-400">Inflow to outflow multiplier</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase">Net Monthly Delta</span>
          <div className={`text-3xl font-extrabold ${summary.monthly_income >= summary.monthly_expenses ? 'text-emerald-600' : 'text-rose-600'}`}>
            {symbol}{(summary.monthly_income - summary.monthly_expenses).toFixed(2)}
          </div>
          <p className="text-xs text-slate-400">Retained surplus this period</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Cash Inflow vs Outflow
            </h2>
            <span className="text-xs text-slate-400">Current Month</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => `${symbol}${value.toFixed(2)}`}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Expense Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-600" />
              Category Outlay Distribution
            </h2>
            <span className="text-xs text-slate-400">{categoryData.length} categories</span>
          </div>

          <div className="h-64 w-full">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No category expenses logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${symbol}${value.toFixed(2)}`}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
