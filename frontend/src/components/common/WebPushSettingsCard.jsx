import React, { useState } from 'react';
import { useReminderNotifications } from '../../context/ReminderNotificationContext';
import {
  BellRing,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Send,
  ShieldCheck,
  Smartphone,
  Info
} from 'lucide-react';

export default function WebPushSettingsCard({ compact = false }) {
  const {
    pushSupported,
    permission,
    isPushSubscribed,
    pushLoading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPushNotification,
  } = useReminderNotifications();

  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });
  const [testSending, setTestSending] = useState(false);

  const showMessage = (text, type = 'info') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 6000);
  };

  const handleTogglePush = async () => {
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPush();
        showMessage('Successfully unsubscribed from Web Push notifications.', 'info');
      } else {
        await subscribeToPush();
        showMessage('Web Push enabled! You will now receive reminders even when BudgetBuddy is closed.', 'success');
      }
    } catch (err) {
      showMessage(err.message || 'Failed to update push subscription.', 'error');
    }
  };

  const handleTestPush = async () => {
    setTestSending(true);
    try {
      const res = await sendTestPushNotification();
      if (res?.success) {
        showMessage('Test push dispatched! Your browser or OS should show a native notification.', 'success');
      } else {
        showMessage(res?.message || 'Could not deliver test notification.', 'error');
      }
    } catch (err) {
      showMessage(err.message || 'Error triggering test push notification.', 'error');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            !pushSupported
              ? 'bg-slate-100 text-slate-500'
              : isPushSubscribed
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
              : permission === 'denied'
              ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
              : 'bg-indigo-50 text-indigo-600 border border-indigo-200/60'
          }`}>
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Web Push Notifications
              </h3>
              {/* Status Badge */}
              {!pushSupported ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  Unsupported Browser
                </span>
              ) : isPushSubscribed ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Active & Scheduled
                </span>
              ) : permission === 'denied' ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  Permission Denied
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Not Subscribed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Receive scheduled bill alerts, payment deadlines, and financial reminders in native desktop notifications — even when the BudgetBuddy tab is completely closed.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {pushSupported && isPushSubscribed && (
            <button
              onClick={handleTestPush}
              disabled={pushLoading || testSending}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Verify push notification delivery immediately"
            >
              {testSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send Test</span>
            </button>
          )}

          {pushSupported && (
            <button
              onClick={handleTogglePush}
              disabled={pushLoading || permission === 'denied'}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 ${
                isPushSubscribed
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
              }`}
            >
              {pushLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPushSubscribed ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isPushSubscribed ? 'Disable Push Alerts' : 'Enable Web Push'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Feedback Message */}
      {actionMessage.text && (
        <div className={`mt-3 p-3 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in ${
          actionMessage.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            : actionMessage.type === 'error'
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
        }`}>
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : actionMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Explanatory Feature Callouts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-1">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
          <Smartphone className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">Cross-Device Delivery</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Subscribe on multiple laptops, tablets, or phones to receive synchronized reminders.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">Secure & Encrypted</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              End-to-end encrypted with VAPID authentication and database atomic deduplication.
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5">
          <BellRing className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">Closed-Tab Scheduling</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Celery and backend workers evaluate reminders on schedule and trigger OS alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
