import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { financeService } from '../api/finance';
import { useRealTimePolling } from '../hooks/useRealTimePolling';
import { formatCurrency, formatDate, notifyFinanceMutation } from '../utils/formatters';
import {
  TrendingDown,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  Loader2
} from 'lucide-react';

export default function ExpensesPage() {
  const { user } = useAuth();
  const symbol = user?.currency_symbol || '$';
  const currencyCode = user?.currency || 'USD';

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const initialForm = {
    amount: '',
    category_name: 'Food & Dining',
    description: '',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'card',
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);

  const categories = [
    'Food & Dining',
    'Travel & Commute',
    'Shopping & Apparel',
    'Education & Books',
    'Entertainment',
    'Healthcare',
    'Bills & Utilities',
    'Miscellaneous',
  ];

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const data = await financeService.getExpenses(params);
      setExpenses(data);
    } catch (err) {
      console.error("Error loading expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useRealTimePolling(fetchExpenses, 20000, [searchTerm, selectedCategory, startDate, endDate]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setFormData(initialForm);
    setError('');
    setModalOpen(true);
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setFormData({
      amount: expense.amount,
      category_name: expense.category_name,
      description: expense.description,
      date: expense.date,
      payment_method: expense.payment_method,
      notes: expense.notes || '',
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount greater than zero.");
      return;
    }
    if (!formData.description.trim()) {
      setError("Please provide a brief description.");
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      if (editingExpense) {
        await financeService.updateExpense(editingExpense.id, payload);
        setSuccess("Expense updated successfully.");
        notifyFinanceMutation('expense', 'update');
      } else {
        await financeService.createExpense(payload);
        setSuccess("Expense recorded successfully.");
        notifyFinanceMutation('expense', 'create');
      }

      setModalOpen(false);
      setFormData(initialForm);
      setEditingExpense(null);
      await fetchExpenses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.amount?.[0] || err.response?.data?.description?.[0] || "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await financeService.deleteExpense(id);
      setSuccess("Expense record deleted.");
      notifyFinanceMutation('expense', 'delete');
      await fetchExpenses();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError("Failed to delete record.");
    }
  };

  const totalFiltered = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-rose-600" />
            Expense Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time database ledger of all outgoing expenditures and purchases.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Expense</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by description or note..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="text-[11px] font-medium text-slate-400">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs"
            />
            <span className="text-[11px] font-medium text-slate-400">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none text-xs"
            />
          </div>

          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              className="px-2 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50 font-medium"
            >
              Clear Dates
            </button>
          )}

          <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 whitespace-nowrap ml-auto">
            Total: <span className="text-rose-600 font-bold">{formatCurrency(totalFiltered, symbol, currencyCode)}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Recorded Expenses</h2>
          <span className="text-xs text-slate-400">{expenses.length} records</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-rose-500" />
            <span>Loading records from database...</span>
          </div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 mx-auto flex items-center justify-center mb-3">
              <TrendingDown className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">No matching expense records</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Click "New Expense" above to record your first transaction.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expenses.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      {item.description}
                      {item.notes && <div className="text-[11px] text-slate-400 font-normal mt-0.5">{item.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-medium text-slate-700">
                        {item.category_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{formatDate(item.date)}</td>
                    <td className="py-3.5 px-4 text-slate-500 capitalize">{item.payment_method}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                      -{formatCurrency(item.amount, symbol, currencyCode)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Modal (Create & Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-600" />
                {editingExpense ? 'Modify Expense Record' : 'Record New Expense'}
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
                  Amount ({symbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-rose-500 font-bold text-base"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. Grocery Haul, Metro Pass"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_name}
                    onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-rose-500 text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-rose-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-rose-500 text-xs"
                >
                  <option value="card">Credit / Debit Card</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI / Online Transfer</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional memo or transaction tags..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-rose-500 text-xs resize-none"
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
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
