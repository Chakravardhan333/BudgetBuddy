import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Bell, Shield, Moon, CheckCircle2 } from 'lucide-react';

export default function AccountSettingsPage() {
  const { user } = useAuth();
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [budgetWarnings, setBudgetWarnings] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Account Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Customize notifications, security preferences, and system behavior.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Preferences saved successfully.</span>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Bell className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-semibold text-slate-900">Notifications & Alerts</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Budget Threshold Warnings</p>
              <p className="text-xs text-slate-500">Alert me when category spending exceeds 80% or 100% of budget.</p>
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
              <p className="text-sm font-medium text-slate-800">Monthly Summary Alerts</p>
              <p className="text-xs text-slate-500">Notify me at month-end when new PDF/Excel reports are ready.</p>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors"
          >
            Save Preferences
          </button>
        </div>
      </div>

      {/* Role & Access Tier */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Shield className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-semibold text-slate-900">Membership Tier</h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-800 capitalize">Current Tier: {user?.role}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {user?.role === 'student' ? 'Access to all core personal budgeting tools.' : 'Full access to premium analytics and exports.'}
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
