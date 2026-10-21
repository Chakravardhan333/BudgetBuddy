import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../api/finance';
import { useRealTimePolling } from '../hooks/useRealTimePolling';
import { formatCurrency, notifyFinanceMutation } from '../utils/formatters';
import {
  PieChart,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Loader2,
  X,
  Calendar,
  Layers
} from 'lucide-react';

export default function BudgetsPage() {
  const { user } = useAuth();
  const symbol = user?.currency_symbol || '$';
  const currencyCode = user?.currency || 'USD';

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const initialForm = {
    monthly_limit: '',
    category: '',
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    warning_threshold: 80,
  };

  const [formData, setFormData] = useState(initialForm);

  const categories = [
    'Food & Dining',
    'Travel & Commute',
    'Shopping & Apparel',
    'Education & Books',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
    'Miscellaneous',
  ];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const data = await financeService.getBudgets({
        month: selectedMonth,
        year: selectedYear,
      });
      setBudgets(data);
    } catch (err) {
      console.error("Failed to load budgets:", err);
    } finally {
      setLoading(false);
    }
  };

  useRealTimePolling(fetchBudgets, 20000, [selectedMonth, selectedYear]);

  const openCreateModal = () => {
    setEditingBudget(null);
    setFormData({
      ...initialForm,
      month: selectedMonth,
      year: selectedYear,
    });
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (budget) => {
    setEditingBudget(budget);
    setFormData({
      monthly_limit: budget.monthly_limit,
      category: budget.category || '',
      month: budget.month,
      year: budget.year,
      warning_threshold: budget.warning_threshold || 80,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.monthly_limit || parseFloat(formData.monthly_limit) <= 0) {
      setError("Please enter a valid budget limit greater than zero.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingBudget) {
        await financeService.updateBudget(editingBudget.id, {
          month: parseInt(formData.month),
          year: parseInt(formData.year),
          monthly_limit: parseFloat(formData.monthly_limit),
          category: formData.category || null,
          warning_threshold: parseInt(formData.warning_threshold),
        });
        setSuccess("Budget cap updated successfully.");
        notifyFinanceMutation('budget:updated');
      } else {
        await financeService.createBudget({
          month: parseInt(formData.month),
          year: parseInt(formData.year),
          monthly_limit: parseFloat(formData.monthly_limit),
          category: formData.category || null,
          warning_threshold: parseInt(formData.warning_threshold),
        });
        setSuccess("Budget cap saved successfully.");
        notifyFinanceMutation('budget:created');
      }
      setModalOpen(false);
      setFormData(initialForm);
      setEditingBudget(null);
      fetchBudgets();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || "Failed to save budget limit.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this budget cap?")) return;
    try {
      await financeService.deleteBudget(id);
      setSuccess("Budget cap removed.");
      notifyFinanceMutation('budget:deleted');
      fetchBudgets();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError("Failed to delete budget limit.");
    }
  };

  const overallBudget = budgets.find((b) => !b.category);
  const categoryBudgets = budgets.filter((b) => b.category);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-purple-600" />
            Monthly Budget Planning
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Establish overall monthly spending caps and category limits to prevent overspending.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month / Year Quick Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent font-medium text-slate-700 focus:outline-none"
            >
              {[today.getFullYear() - 1, today.getFullYear(), today.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition-colors shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Set Budget Limit</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {loading && budgets.length === 0 ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
          <span>Loading budget status...</span>
        </div>
      ) : (
        <>
          {/* Overview Stat Cards */}
          {overallBudget ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">Planned Monthly Limit</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(overallBudget)}
                      className="p-1 text-slate-400 hover:text-purple-600 rounded transition-colors"
                      title="Edit overall budget"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(overallBudget.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete overall budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{formatCurrency(overallBudget.monthly_limit, currencyCode)}</div>
                <p className="text-xs text-slate-500">Period: {monthNames[selectedMonth - 1]} {selectedYear}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">Actual Outlay</span>
                <div className="text-2xl font-bold text-rose-600">{formatCurrency(overallBudget.actual_spending, currencyCode)}</div>
                <p className="text-xs text-slate-500">Utilization: {overallBudget.utilization_percentage}%</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                <span className="text-xs font-semibold uppercase text-slate-500">Remaining Cushion</span>
                <div className={`text-2xl font-bold ${overallBudget.remaining_budget >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(overallBudget.remaining_budget, currencyCode)}
                </div>
                <p className="text-xs text-slate-500">
                  {overallBudget.remaining_budget >= 0 ? 'Within budget allowance' : 'Limit exceeded!'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">No overall budget cap set for {monthNames[selectedMonth - 1]} {selectedYear}</p>
                <p className="text-xs text-slate-500 mt-1">Set an overall monthly target to activate progress bars and alert notifications.</p>
              </div>
              <button
                onClick={openCreateModal}
                className="px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium text-xs rounded-xl transition-colors whitespace-nowrap"
              >
                + Set Overall Cap
              </button>
            </div>
          )}

          {/* Category Budgets Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                Category-Specific Limits ({monthNames[selectedMonth - 1]} {selectedYear})
              </h2>
              <span className="text-xs text-slate-400">{categoryBudgets.length} configured</span>
            </div>

            {categoryBudgets.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No category-specific limits established for this month.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoryBudgets.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl border border-slate-200 space-y-2.5 hover:border-slate-300 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{b.category}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600">
                          {formatCurrency(b.actual_spending, currencyCode)} / {formatCurrency(b.monthly_limit, currencyCode)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                            title="Edit category budget"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Delete category budget"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          b.utilization_percentage > 100
                            ? 'bg-rose-500'
                            : b.utilization_percentage > 80
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(b.utilization_percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{b.utilization_percentage}% utilized</span>
                      <span className={b.remaining_budget < 0 ? 'text-rose-600 font-semibold' : ''}>
                        Remaining: {formatCurrency(b.remaining_budget, currencyCode)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-purple-600" />
                {editingBudget ? 'Edit Budget Limit' : 'Establish Budget Limit'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Budget Limit Amount ({symbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.monthly_limit}
                  onChange={(e) => setFormData({ ...formData, monthly_limit: e.target.value })}
                  placeholder="e.g. 600.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-purple-500 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Scope
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-purple-500 text-xs"
                >
                  <option value="">Overall Monthly Budget (All Categories)</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Month
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>{name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{editingBudget ? 'Save Changes' : 'Save Budget'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
