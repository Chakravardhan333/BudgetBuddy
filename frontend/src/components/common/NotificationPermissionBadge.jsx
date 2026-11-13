import React from 'react';
import { Bell, BellOff, BellRing, ShieldCheck, AlertCircle } from 'lucide-react';

export default function NotificationPermissionBadge({
  permission,
  onRequestPermission,
  variant = 'header', // 'header' | 'banner' | 'pill'
}) {
  if (permission === 'unsupported') {
    return null;
  }

  if (permission === 'granted') {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold select-none"
        title="Browser desktop alerts are active for scheduled financial reminders"
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="hidden sm:inline">Notifications Enabled</span>
        <span className="sm:hidden">Enabled</span>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs font-semibold select-none"
        title="Notifications are blocked in your browser settings. To enable, click the lock/settings icon next to your URL bar."
      >
        <BellOff className="w-3.5 h-3.5 text-rose-500" />
        <span className="hidden sm:inline">Notifications Blocked</span>
        <span className="sm:hidden">Blocked</span>
      </div>
    );
  }

  // Default state: User hasn't made a choice yet
  return (
    <button
      onClick={onRequestPermission}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-xs font-semibold transition-all shadow-2xs"
      title="Click to receive instant desktop reminders when scheduled bill payments and budget alerts are due"
    >
      <BellRing className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />
      <span>Enable Notifications</span>
    </button>
  );
}
