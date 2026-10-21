import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../api/finance';
import { useRealTimePolling } from '../hooks/useRealTimePolling';
import { formatCurrency, formatDate, notifyFinanceMutation } from '../utils/formatters';
import {
  Target,
  Plus,
  PiggyBank,
  CheckCircle2,
  Loader2,
  X,
  Calendar,
  Trash2,
  Edit2
} from 'lucide-react';

export default function GoalsPage() {
  const { user } = useAuth();
  const symbol = user?.currency_symbol || '$';
  const currencyCode = user?.currency || 'USD';

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [contributeModalOpen, setContributeModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [editingGoal, setEditingGoal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initialForm = {
    title: '',
    target_amount: '',
    target_date: '',
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionNotes, setContributionNotes] = useState('');

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const data = await financeService.getGoals();
      setGoals(data);
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setLoading(false);
    }
  };

  useRealTimePolling(fetchGoals, 20000);

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormData(initialForm);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      target_amount: goal.target_amount,
      target_date: goal.target_date,
      notes: goal.notes || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      setError("Please enter a valid target amount greater than zero.");
      return;
    }
    if (!formData.target_date) {
      setError("Please set a target completion date.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      if (editingGoal) {
        await financeService.updateGoal(editingGoal.id, {
          ...formData,
          target_amount: parseFloat(formData.target_amount),
        });
        setSuccess("Savings goal updated successfully.");
        notifyFinanceMutation('goal:updated');
      } else {
        await financeService.createGoal({
          ...formData,
          target_amount: parseFloat(formData.target_amount),
        });
        setSuccess("Savings goal created successfully.");
        notifyFinanceMutation('goal:created');
      }
      setModalOpen(false);
      setFormData(initialForm);
      setEditingGoal(null);
      fetchGoals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.target_amount?.[0] || err.response?.data?.detail || "Failed to save goal.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this savings goal?")) return;
    try {
      await financeService.deleteGoal(id);
      setSuccess("Savings goal removed.");
      notifyFinanceMutation('goal:deleted');
      fetchGoals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError("Failed to delete savings goal.");
    }
  };

  const handleContribute = async (e) => {
    e.preventDefault();
    if (!contributionAmount || parseFloat(contributionAmount) <= 0) {
      setError("Please enter a valid contribution amount.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      await financeService.contributeToGoal(selectedGoal.id, {
        amount: parseFloat(contributionAmount),
        date: new Date().toISOString().split('T')[0],
        notes: contributionNotes,
      });
      setSuccess(`Added ${formatCurrency(contributionAmount, currencyCode)} to "${selectedGoal.title}".`);
      notifyFinanceMutation('goal:contributed');
      setContributeModalOpen(false);
      setContributionAmount('');
      setContributionNotes('');
      setSelectedGoal(null);
      fetchGoals();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.amount?.[0] || err.response?.data?.detail || "Failed to record contribution.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-pink-600" />
            Savings Goals Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Set monetary targets, log contributions, and track progress toward your milestones.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs transition-colors shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>New Savings Target</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Goals Cards Grid */}
      {loading && goals.length === 0 ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
          <span>Loading savings goals from database...</span>
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-pink-50 text-pink-500 mx-auto flex items-center justify-center mb-3">
            <PiggyBank className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No active savings targets</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            Click "New Savings Target" above to create milestones like Emergency Fund, New Laptop, or Vacation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((g) => (
            <div key={g.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    g.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-pink-50 text-pink-700 border-pink-200'
                  }`}>
                    {g.status ? g.status.replace('_', ' ') : 'in progress'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Due {formatDate(g.target_date)}
                    </span>
                    <button
                      onClick={() => openEditModal(g)}
                      className="p-1 text-slate-400 hover:text-pink-600 transition-colors"
                      title="Edit goal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h2 className="text-base font-bold text-slate-900">{g.title}</h2>
                {g.notes && <p className="text-xs text-slate-500">{g.notes}</p>}

                <div className="pt-2 flex justify-between items-baseline">
                  <div>
                    <span className="text-xl font-extrabold text-slate-900">{formatCurrency(g.current_amount, currencyCode)}</span>
                    <span className="text-xs text-slate-400"> / {formatCurrency(g.target_amount, currencyCode)}</span>
                  </div>
                  <span className="text-sm font-bold text-pink-600">{g.progress_percentage}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      g.progress_percentage >= 100 ? 'bg-emerald-500' : 'bg-pink-600'
                    }`}
                    style={{ width: `${Math.min(g.progress_percentage, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {formatCurrency(Math.max(0, g.target_amount - g.current_amount), currencyCode)} needed
                </span>
                <button
                  onClick={() => { setSelectedGoal(g); setContributeModalOpen(true); setError(''); }}
                  className="px-3 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold transition-colors"
                >
                  + Add Funds
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New / Edit Goal Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-pink-600" />
                {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
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
                  Goal Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. New Study Laptop"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-pink-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Amount ({symbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.target_amount}
                  onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                  placeholder="1000.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-pink-500 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Deadline Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Purpose or milestone details..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-pink-500 text-xs resize-none"
                />
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
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{editingGoal ? 'Save Changes' : 'Save Goal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeModalOpen && selectedGoal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">
                Add to "{selectedGoal.title}"
              </h2>
              <button onClick={() => setContributeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleContribute} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contribution Amount ({symbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="50.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold text-base focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={contributionNotes}
                  onChange={(e) => setContributionNotes(e.target.value)}
                  placeholder="e.g. Monthly transfer from savings"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setContributeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-medium text-xs shadow-xs disabled:opacity-50"
                >
                  {saving ? "Recording..." : "Record Contribution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
