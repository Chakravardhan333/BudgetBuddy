import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsService } from '../api/notifications';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Loader2,
  Sparkles
} from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationsService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getTypeStyle = (type, isRead) => {
    if (isRead) return 'bg-white border-slate-200';
    switch (type) {
      case 'alert':
        return 'bg-rose-50/40 border-rose-300';
      case 'warning':
        return 'bg-amber-50/40 border-amber-300';
      case 'success':
        return 'bg-emerald-50/40 border-emerald-300';
      default:
        return 'bg-blue-50/40 border-blue-300';
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            Notifications & System Alerts
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time threshold warnings, overspending alerts, and savings milestone achievements.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all ({unreadCount}) as read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Evaluating budget thresholds & savings goals...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 mx-auto flex items-center justify-center mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">All caught up!</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            No active budget warnings or alerts at this moment. You will be notified automatically if spending nears a cap.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 shadow-xs ${getTypeStyle(
                n.notification_type,
                n.is_read
              )}`}
            >
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200">
                {getTypeIcon(n.notification_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 truncate">{n.title}</h2>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                  {n.link ? (
                    <NavLink
                      to={n.link}
                      className="font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-0.5"
                    >
                      <span>Review Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </NavLink>
                  ) : <span />}

                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-slate-500 hover:text-slate-800 font-medium text-[11px]"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
