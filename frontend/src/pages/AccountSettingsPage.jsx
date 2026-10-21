import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getTimezonePreference,
  setTimezonePreference,
  COMMON_TIMEZONES,
  notifyFinanceMutation
} from '../utils/formatters';
import {
  Settings,
  Bell,
  Shield,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe
} from 'lucide-react';

export default function AccountSettingsPage() {
  const { user, updateUserProfile } = useAuth();

  const [selectedTz, setSelectedTz] = useState(getTimezonePreference());
  const [selectedCurrency, setSelectedCurrency] = useState(user?.currency || 'USD');
  const [budgetWarnings, setBudgetWarnings] = useState(true);
  const [monthlyAlerts, setMonthlyAlerts] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const currencies = [
    { code: 'INR', label: 'INR (₹) - Indian Rupee (Default for India)' },
    { code: 'USD', label: 'USD ($) - US Dollar' },
    { code: 'EUR', label: 'EUR (€) - Euro' },
    { code: 'GBP', label: 'GBP (£) - British Pound' },
    { code: 'CAD', label: 'CAD (C$) - Canadian Dollar' },
    { code: 'AUD', label: 'AUD (A$) - Australian Dollar' },
    { code: 'JPY', label: 'JPY (¥) - Japanese Yen' },
  ];

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      // 1. Save timezone locally
      setTimezonePreference(selectedTz);

      // 2. Persist currency in backend profile if changed
      if (selectedCurrency !== user?.currency) {
        const res = await updateUserProfile({ currency: selectedCurrency });
        if (!res.success) {
          throw new Error(res.error || 'Failed to update currency preference.');
        }
      }

      notifyFinanceMutation('settings:updated');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(typeof err === 'string' ? err : err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-slate-700" />
          Account & Regional Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Customize currency formatting, regional timezones, notification alerts, and membership profile.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Regional and account preferences updated successfully.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Regional: Timezone & Currency */}
      <form onSubmit={handleSavePreferences} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Globe className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-slate-900">Regional & Localization Preferences</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              Display Timezone
            </label>
            <select
              value={selectedTz}
              onChange={(e) => setSelectedTz(e.target.value)}
              className="w-full sm:w-96 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Controls live clock timestamp displays, ledger records, and report date headers. Defaults to your local browser timezone.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-slate-500" />
              Default Display Currency
            </label>
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="w-full sm:w-96 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Select INR (₹) for Indian Rupee standard format (e.g. ₹1,23,456.78) or USD ($) for standard notation.
            </p>
          </div>
        </div>

        {/* Notifications Checkboxes */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div className="flex items-center gap-2 pb-1">
            <Bell className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">Automated Notification Rules</h3>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Budget Threshold Warnings</p>
              <p className="text-xs text-slate-500">Alert me when category spending exceeds 80% or 100% of budget cap.</p>
            </div>
            <input
              type="checkbox"
              checked={budgetWarnings}
              onChange={(e) => setBudgetWarnings(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Milestone Achievements</p>
              <p className="text-xs text-slate-500">Celebrate and notify when savings milestones reach 50% or 100% completion.</p>
            </div>
            <input
              type="checkbox"
              checked={monthlyAlerts}
              onChange={(e) => setMonthlyAlerts(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center gap-2 disabled:opacity-50 shadow-xs"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>

      {/* Role & Access Tier */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Shield className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-semibold text-slate-900">Membership & Authentication Info</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 capitalize">Account Role: {user?.role || 'Student'}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Signed in as <span className="font-medium text-slate-700">{user?.username}</span> ({user?.email || 'no email configured'}).
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
            Active
          </span>
        </div>
      </div>
    </div>
  );
}
