import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useReminderNotifications } from '../context/ReminderNotificationContext';
import { notificationsService } from '../api/notifications';
import NotificationPermissionBadge from '../components/common/NotificationPermissionBadge';
import WebPushSettingsCard from '../components/common/WebPushSettingsCard';

import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  Loader2,
  Sparkles,
  Clock,
  Plus,
  X,
  CalendarClock,
  Trash2,
  Check,
  XCircle,
  BellRing,
  Edit2,
  Filter,
  Search,
  Timer,
  ShieldCheck,
  Flame,
  Calendar,
  Layers,
  ArrowUpDown,
  Target,
  PieChart,
  TrendingDown,
  ExternalLink
} from 'lucide-react';

// ─── Notification Categories Configuration ───
const NOTIF_CATEGORY_CONFIG = {
  all: { label: 'All', icon: Layers, color: 'text-slate-700', bg: 'bg-slate-100', border: 'border-slate-300' },
  reminders: { label: 'Reminders', icon: CalendarClock, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  payments: { label: 'Payments', icon: Target, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  budgets: { label: 'Budgets', icon: PieChart, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  expenses: { label: 'Expenses', icon: TrendingDown, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  system: { label: 'System Alerts', icon: ShieldCheck, color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
};

function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const d = new Date(dateString);
  const diffSec = Math.floor((now - d) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}


// ─── Category Configuration ───
const CATEGORY_CONFIG = {
  payment:   { label: 'Payment Reminder',   color: 'rose',    border: 'border-rose-200',    bg: 'bg-rose-50',    text: 'text-rose-700',    icon: AlertCircle },
  bill:      { label: 'Bill Reminder',      color: 'amber',   border: 'border-amber-200',   bg: 'bg-amber-50',   text: 'text-amber-700',   icon: Clock },
  savings:   { label: 'Savings Reminder',   color: 'emerald', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Sparkles },
  personal:  { label: 'Personal Finance',   color: 'indigo',  border: 'border-indigo-200',  bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: Layers },
  budget:    { label: 'Budget Reminder',    color: 'blue',    border: 'border-blue-200',    bg: 'bg-blue-50',    text: 'text-blue-700',    icon: Info },
  expense:   { label: 'Expense Reminder',   color: 'orange',  border: 'border-orange-200',  bg: 'bg-orange-50',  text: 'text-orange-700',  icon: AlertTriangle },
  financial: { label: 'Financial Activity', color: 'purple',  border: 'border-purple-200',  bg: 'bg-purple-50',  text: 'text-purple-700',  icon: Calendar },
};

// ─── Priority Configuration ───
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'bg-rose-500 text-white border-rose-600', icon: Flame },
  high:   { label: 'High',   color: 'bg-amber-500 text-white border-amber-600', icon: AlertTriangle },
  medium: { label: 'Medium', color: 'bg-blue-500 text-white border-blue-600',  icon: Info },
  low:    { label: 'Low',    color: 'bg-slate-500 text-white border-slate-600', icon: Clock },
};

// Helper: Extract human-readable validation error messages from backend responses
const extractErrorMessage = (err, fallbackMsg = 'Failed to save reminder. Please verify inputs.') => {
  if (!err) return fallbackMsg;
  if (err.userFacingMessage) return err.userFacingMessage;
  if (err.response?.status === 401) {
    return 'Your session has expired or you are unauthenticated. Please refresh or log in again.';
  }
  if (err.response?.status === 404) {
    return 'Reminder service endpoint not found on server (404). Please ensure the latest backend reminder routes are deployed.';
  }
  if (err.response?.status >= 500) {
    return `Server error (${err.response.status}). Please check backend migrations or database logs.`;
  }
  if (err.response?.data) {
    const data = err.response.data;
    if (typeof data === 'string') {
      if (data.includes('<html') || data.includes('<!DOCTYPE')) {
        return `Server returned an unexpected HTTP ${err.response.status} response.`;
      }
      return data;
    }
    if (data.detail && typeof data.detail === 'string') return data.detail;
    if (data.error && typeof data.error === 'string') return data.error;
    if (data.message && typeof data.message === 'string') return data.message;
    if (typeof data === 'object') {
      const messages = [];
      for (const [key, val] of Object.entries(data)) {
        const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
        if (Array.isArray(val)) {
          messages.push(`${fieldName}: ${val.join(' ')}`);
        } else if (typeof val === 'string') {
          messages.push(`${fieldName}: ${val}`);
        } else if (val && typeof val === 'object') {
          messages.push(`${fieldName}: ${JSON.stringify(val)}`);
        }
      }
      if (messages.length > 0) return messages.join(' | ');
    }
  }
  if (err.message) return err.message;
  return fallbackMsg;
};

// Helper: Get local datetime string (YYYY-MM-DDTHH:MM) for datetime-local input
const getDefaultDatetimeString = (hoursFromNow = 2) => {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  d.setMinutes(0, 0, 0);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'reminders' ? 'reminders' : 'alerts');

  // Synchronize activeTab with URL search parameters
  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab === 'reminders' || currentTab === 'alerts') {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // ─── Global Notification Permission & Engine ───
  const {
    permission: browserPermission,
    requestPermission: requestBrowserPermission,
    checkDueReminders: refreshGlobalReminders,
  } = useReminderNotifications();

  // ─── Smart Notification Center State & Filters ───
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifCategoryFilter, setNotifCategoryFilter] = useState('all');
  const [notifReadFilter, setNotifReadFilter] = useState('all'); // 'all' | 'unread' | 'read'
  const [notifSearch, setNotifSearch] = useState('');


  // ─── Reminders State ───
  const [reminders, setReminders] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, due: 0, overdue: 0, upcoming: 0, completed: 0 });
  const [remindersLoading, setRemindersLoading] = useState(true);

  // ─── Form & Modal State (Create / Edit) ───
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'bill',
    priority: 'medium',
    reminder_datetime: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ─── Filter State ───
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active'); // 'all' | 'active' | 'due' | 'completed'
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Fetch System Notifications ───
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

  // ─── Fetch Reminders & Summary ───
  const fetchReminders = useCallback(async () => {
    try {
      setRemindersLoading(true);
      const [allReminders, due, summaryData] = await Promise.all([
        notificationsService.getReminders(),
        notificationsService.getDueReminders(),
        notificationsService.getReminderSummary().catch(() => null),
      ]);
      setReminders(allReminders || []);
      setDueReminders(due || []);
      if (summaryData) {
        setSummary(summaryData);
      } else if (Array.isArray(allReminders)) {
        const now = new Date();
        const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const active = allReminders.filter((r) => !r.is_completed && !r.is_dismissed);
        const dueList = active.filter((r) => new Date(r.reminder_datetime) <= now);
        const overdue = active.filter((r) => new Date(r.reminder_datetime).getTime() + 3600000 <= now.getTime());
        const upcoming = active.filter((r) => {
          const d = new Date(r.reminder_datetime);
          return d > now && d <= in48h;
        });
        const completed = allReminders.filter((r) => r.is_completed);
        setSummary({
          total: allReminders.length,
          active: active.length,
          due: dueList.length,
          overdue: overdue.length,
          upcoming: upcoming.length,
          completed: completed.length,
          dismissed: allReminders.filter((r) => r.is_dismissed).length,
        });
      }
    } catch (err) {
      console.error("Failed to load reminders:", err);
    } finally {
      setRemindersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchReminders();

    const handleUpdate = () => {
      fetchReminders();
    };
    window.addEventListener('reminders:updated', handleUpdate);
    return () => {
      window.removeEventListener('reminders:updated', handleUpdate);
    };
  }, [fetchReminders]);

  // ─── System Alert Handlers ───
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
      await notificationsService.markAllAsRead(notifCategoryFilter === 'all' ? null : notifCategoryFilter);
      setNotifications((prev) =>
        prev.map((n) =>
          notifCategoryFilter === 'all' || (n.category || 'system') === notifCategoryFilter
            ? { ...n, is_read: true }
            : n
        )
      );
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  };

  const handleDeleteNotification = async (e, id) => {
    if (e && e.stopPropagation) e.stopPropagation();
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleClearReadNotifications = async () => {
    try {
      await notificationsService.clearNotifications(
        notifCategoryFilter === 'all' ? {} : { category: notifCategoryFilter }
      );
      setNotifications((prev) =>
        prev.filter((n) =>
          notifCategoryFilter === 'all'
            ? !n.is_read
            : (n.category || 'system') !== notifCategoryFilter || !n.is_read
        )
      );
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error("Failed to clear read notifications:", err);
    }
  };

  const handleNotificationCardClick = async (n) => {
    if (!n.is_read) {
      handleMarkRead(n.id);
    }
    let targetLink = n.link;
    if (!targetLink) {
      switch (n.category) {
        case 'reminders':
          targetLink = '/notifications?tab=reminders';
          break;
        case 'budgets':
          targetLink = '/budgets';
          break;
        case 'expenses':
          targetLink = '/expenses';
          break;
        case 'payments':
          targetLink = '/goals';
          break;
        default:
          targetLink = '/notifications';
      }
    }
    navigate(targetLink);
  };


  // ─── Reminder Form Open/Close Handlers ───
  const openCreateModal = () => {
    setEditingReminder(null);
    setFormData({
      title: '',
      message: '',
      category: 'bill',
      priority: 'medium',
      reminder_datetime: getDefaultDatetimeString(2),
    });
    setFormError('');
    setShowFormModal(true);
  };

  const openEditModal = (reminder) => {
    setEditingReminder(reminder);
    let localDatetime = '';
    if (reminder.reminder_datetime) {
      const d = new Date(reminder.reminder_datetime);
      if (!isNaN(d.getTime())) {
        localDatetime = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      }
    }
    setFormData({
      title: reminder.title || '',
      message: reminder.message || '',
      category: reminder.category || 'bill',
      priority: reminder.priority || 'medium',
      reminder_datetime: localDatetime || getDefaultDatetimeString(2),
    });
    setFormError('');
    setShowFormModal(true);
  };

  const handleSaveReminder = async (e) => {
    e.preventDefault();
    setFormError('');

    const titleTrimmed = formData.title?.trim();
    if (!titleTrimmed) {
      setFormError('Please enter a reminder title.');
      return;
    }
    if (!formData.reminder_datetime) {
      setFormError('Please select a scheduled date and time.');
      return;
    }

    const parsedDate = new Date(formData.reminder_datetime);
    if (isNaN(parsedDate.getTime())) {
      setFormError('Invalid date/time format. Please pick a valid date and time.');
      return;
    }

    try {
      setSubmitting(true);
      const isoDatetime = parsedDate.toISOString();
      const payload = {
        title: titleTrimmed,
        message: (formData.message || '').trim(),
        description: (formData.message || '').trim(),
        category: formData.category || 'bill',
        priority: formData.priority || 'medium',
        reminder_datetime: isoDatetime,
      };

      let saved;
      if (editingReminder && editingReminder.id) {
        saved = await notificationsService.updateReminder(editingReminder.id, payload);
        if (saved && saved.id) {
          setReminders((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
        }
      } else {
        saved = await notificationsService.createReminder(payload);
        if (saved && saved.id) {
          setReminders((prev) => [saved, ...prev]);
        }
      }

      setShowFormModal(false);
      setActiveTab('reminders');
      await fetchReminders();
      window.dispatchEvent(new Event('notifications:updated'));
      window.dispatchEvent(new Event('reminders:updated'));
      refreshGlobalReminders();
    } catch (err) {
      console.error("Failed to save reminder:", err);
      const errorMsg = extractErrorMessage(err, 'Failed to save reminder. Please verify inputs.');
      setFormError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Reminder Action Handlers ───
  const handleCompleteReminder = async (id) => {
    try {
      await notificationsService.completeReminder(id);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_completed: true, is_due: false, is_overdue: false } : r))
      );
      setDueReminders((prev) => prev.filter((r) => r.id !== id));
      await fetchReminders();
      window.dispatchEvent(new Event('notifications:updated'));
      window.dispatchEvent(new Event('reminders:updated'));
      refreshGlobalReminders();
    } catch (err) {
      console.error("Failed to complete reminder:", err);
    }
  };

  const handleDismissReminder = async (id) => {
    try {
      await notificationsService.dismissReminder(id);
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, is_dismissed: true, is_due: false, is_overdue: false } : r))
      );
      setDueReminders((prev) => prev.filter((r) => r.id !== id));
      await fetchReminders();
      window.dispatchEvent(new Event('notifications:updated'));
      window.dispatchEvent(new Event('reminders:updated'));
      refreshGlobalReminders();
    } catch (err) {
      console.error("Failed to dismiss reminder:", err);
    }
  };

  const handleSnoozeReminder = async (id, minutes, hours, days) => {
    try {
      const payload = {};
      if (minutes) payload.minutes = minutes;
      else if (hours) payload.hours = hours;
      else if (days) payload.days = days;
      else payload.hours = 1;

      await notificationsService.snoozeReminder(id, payload);
      await fetchReminders();
      window.dispatchEvent(new Event('notifications:updated'));
      window.dispatchEvent(new Event('reminders:updated'));
      refreshGlobalReminders();
    } catch (err) {
      console.error("Failed to snooze reminder:", err);
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm("Are you sure you want to permanently delete this reminder?")) return;
    try {
      await notificationsService.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      setDueReminders((prev) => prev.filter((r) => r.id !== id));
      await fetchReminders();
      window.dispatchEvent(new Event('notifications:updated'));
      window.dispatchEvent(new Event('reminders:updated'));
      refreshGlobalReminders();
    } catch (err) {
      console.error("Failed to delete reminder:", err);
    }
  };

  // ─── Helpers ───
  const formatReminderDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' at ' + d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
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
        return 'bg-rose-50/50 border-rose-300';
      case 'warning':
        return 'bg-amber-50/50 border-amber-300';
      case 'success':
        return 'bg-emerald-50/50 border-emerald-300';
      default:
        return 'bg-blue-50/50 border-blue-300';
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ─── Filtered Notifications & Category Counts ───
  const categoryCounts = useMemo(() => {
    const counts = { all: notifications.length, reminders: 0, payments: 0, budgets: 0, expenses: 0, system: 0 };
    notifications.forEach((n) => {
      const cat = n.category || 'system';
      if (counts[cat] !== undefined) counts[cat]++;
    });
    return counts;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Category filter
      const cat = n.category || 'system';
      if (notifCategoryFilter !== 'all' && cat !== notifCategoryFilter) return false;
      // Read status filter
      if (notifReadFilter === 'unread' && n.is_read) return false;
      if (notifReadFilter === 'read' && !n.is_read) return false;
      // Search filter
      if (notifSearch.trim()) {
        const q = notifSearch.toLowerCase();
        const matchesTitle = (n.title || '').toLowerCase().includes(q);
        const matchesMsg = (n.message || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg) return false;
      }
      return true;
    });
  }, [notifications, notifCategoryFilter, notifReadFilter, notifSearch]);


  // ─── Filtered Reminders ───
  const filteredReminders = useMemo(() => {
    return reminders.filter((r) => {
      // Category filter
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      // Priority filter
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      // Status filter
      if (statusFilter === 'active' && (r.is_completed || r.is_dismissed)) return false;
      if (statusFilter === 'due' && (!r.is_due || r.is_completed || r.is_dismissed)) return false;
      if (statusFilter === 'completed' && !r.is_completed) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesMsg = (r.message || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesMsg) return false;
      }
      return true;
    });
  }, [reminders, categoryFilter, priorityFilter, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* ─── Top Header & Controls ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            Notification & Smart Reminder Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time threshold alerts, personal financial reminders, and automated scheduling.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Native Desktop Notifications Status & Permission Trigger */}
          <NotificationPermissionBadge
            permission={browserPermission}
            onRequestPermission={requestBrowserPermission}
          />

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Set Reminder</span>
          </button>
        </div>
      </div>

      {/* ─── Persistent Web Push (Closed-Tab Reminders) Settings Section ─── */}
      <WebPushSettingsCard />

      {/* ─── Overdue & Due Reminders High Priority Alert Banner ─── */}

      {dueReminders.length > 0 && (
        <div className="bg-rose-50/90 border-2 border-rose-400/80 rounded-2xl p-4 sm:p-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-rose-500 text-white rounded-xl shadow-xs">
                <BellRing className="w-5 h-5 animate-bounce" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                  <span>Action Required: {dueReminders.length} Reminder{dueReminders.length > 1 ? 's' : ''} Due</span>
                </h2>
                <p className="text-xs text-rose-700 mt-0.5">
                  Scheduled financial obligations and bill payments awaiting your action.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
            {dueReminders.map((r) => {
              const cat = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.financial;
              const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
              const CatIcon = cat.icon;

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-xl p-3.5 border border-rose-200 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-7 h-7 rounded-lg ${cat.bg} ${cat.text} flex items-center justify-center flex-shrink-0`}>
                          <CatIcon className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 truncate">{r.title}</h3>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${priority.color}`}>
                        {priority.label}
                      </span>
                    </div>

                    {r.message && (
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{r.message}</p>
                    )}

                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium mt-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Due: {formatReminderDate(r.reminder_datetime)}</span>
                      {r.is_overdue && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-bold">OVERDUE</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSnoozeReminder(r.id, 10, null, null)}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Snooze 10 minutes"
                      >
                        +10m
                      </button>
                      <button
                        onClick={() => handleSnoozeReminder(r.id, null, 1, null)}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Snooze 1 hour"
                      >
                        +1h
                      </button>
                      <button
                        onClick={() => handleSnoozeReminder(r.id, null, null, 1)}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                        title="Snooze 1 day"
                      >
                        +1d
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDismissReminder(r.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleCompleteReminder(r.id)}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Metric Summary KPI Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Reminders</span>
            <CalendarClock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{summary.active || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Due Now</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600">{summary.due || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Upcoming (48h)</span>
            <Timer className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600">{summary.upcoming || 0}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{summary.completed || 0}</div>
        </div>
      </div>

      {/* ─── Main Tab Bar ─── */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => handleTabChange('alerts')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'alerts'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bell className="w-4 h-4 text-emerald-600" />
          <span>System Alerts & Thresholds</span>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('reminders')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'reminders'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarClock className="w-4 h-4 text-blue-600" />
          <span>Smart Reminders</span>
          {summary.active > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white">
              {summary.active}
            </span>
          )}
        </button>
      </div>

      {/* ═══════════════════════ TAB 1: SYSTEM ALERTS & NOTIFICATION HISTORY ═══════════════════════ */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* ─── Search & Controls Bar ─── */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notification history..."
                value={notifSearch}
                onChange={(e) => setNotifSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Read/Unread Status Filter */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setNotifReadFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  notifReadFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setNotifReadFilter('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  notifReadFilter === 'unread'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unread
              </button>
              <button
                type="button"
                onClick={() => setNotifReadFilter('read')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  notifReadFilter === 'read'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Read
              </button>
            </div>
          </div>

          {/* ─── Category Filter Pills ─── */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {Object.entries(NOTIF_CATEGORY_CONFIG).map(([catKey, cfg]) => {
              const count = categoryCounts[catKey] || 0;
              const isSelected = notifCategoryFilter === catKey;
              const IconComp = cfg.icon;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setNotifCategoryFilter(catKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{cfg.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isSelected ? 'bg-emerald-200 text-emerald-900 font-bold' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ─── Action Header ─── */}
          <div className="flex items-center justify-between pt-1">
            <h2 className="text-sm font-bold text-slate-800">
              Notification History ({filteredNotifications.length})
            </h2>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all as read</span>
                </button>
              )}
              {notifications.some((n) => n.is_read) && (
                <button
                  onClick={handleClearReadNotifications}
                  className="text-xs font-medium text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                  title="Remove all read notifications from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear read</span>
                </button>
              )}
            </div>
          </div>

          {/* ─── Notification List ─── */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Evaluating live budget caps and milestone goals...</span>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No notifications found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {notifSearch || notifCategoryFilter !== 'all' || notifReadFilter !== 'all'
                  ? 'Try clearing your search query or category filters.'
                  : 'You have no notifications yet. Transaction alerts, reminders, and budget warnings will appear here permanently.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((n) => {
                const catCfg = NOTIF_CATEGORY_CONFIG[n.category] || NOTIF_CATEGORY_CONFIG.system;
                const CatIcon = catCfg.icon;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationCardClick(n)}
                    className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 shadow-xs cursor-pointer hover:shadow-md ${getTypeStyle(
                      n.notification_type,
                      n.is_read
                    )}`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200 shadow-2xs">
                      {getTypeIcon(n.notification_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${catCfg.bg} ${catCfg.color} ${catCfg.border}`}
                          >
                            <CatIcon className="w-3 h-3" />
                            <span>{catCfg.label}</span>
                          </span>
                          <h2 className="text-sm font-bold text-slate-900 truncate">{n.title}</h2>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                        <span className="font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5">
                          <span>View Details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>

                        <div className="flex items-center gap-2">
                          {!n.is_read && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(n.id);
                              }}
                              className="text-slate-500 hover:text-slate-800 font-medium text-[11px] px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
                            >
                              Mark read
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(e, n.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ TAB 2: SMART REMINDERS ═══════════════════════ */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          {/* ─── Search & Filter Bar ─── */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search reminders by title or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:outline-none"
              >
                <option value="all">All Categories</option>
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label} Priority</option>
                ))}
              </select>

              {/* Status Segment */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50 focus:outline-none"
              >
                <option value="active">Active Only</option>
                <option value="due">Due / Overdue</option>
                <option value="completed">Completed</option>
                <option value="all">All Statuses</option>
              </select>
            </div>
          </div>

          {/* ─── Reminders List ─── */}
          {remindersLoading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
              <span>Loading smart reminders...</span>
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <CalendarClock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">No reminders match criteria</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery || categoryFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try clearing your filters or search keywords.'
                  : 'Click "Set Reminder" above to create scheduled bill payments, expense reminders, or financial alerts.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReminders.map((r) => {
                const cat = CATEGORY_CONFIG[r.category] || CATEGORY_CONFIG.financial;
                const priority = PRIORITY_CONFIG[r.priority] || PRIORITY_CONFIG.medium;
                const CatIcon = cat.icon;
                const isOverdue = r.is_overdue;
                const isDue = r.is_due;

                return (
                  <div
                    key={r.id}
                    className={`p-4 rounded-2xl border transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      r.is_completed
                        ? 'bg-slate-50/60 border-slate-200 opacity-70'
                        : isDue
                        ? 'bg-rose-50/40 border-rose-300 ring-1 ring-rose-200'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-xl ${cat.bg} ${cat.text} flex items-center justify-center flex-shrink-0 mt-0.5 border ${cat.border}`}>
                        <CatIcon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm font-bold text-slate-900 truncate ${r.is_completed ? 'line-through text-slate-500' : ''}`}>
                            {r.title}
                          </h3>

                          {/* Category badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cat.bg} ${cat.text} ${cat.border}`}>
                            {cat.label}
                          </span>

                          {/* Priority badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${priority.color}`}>
                            {priority.label}
                          </span>

                          {/* Status Tag */}
                          {r.is_completed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Completed
                            </span>
                          ) : isOverdue ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white animate-pulse">
                              Overdue
                            </span>
                          ) : isDue ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                              Due Now
                            </span>
                          ) : null}

                          {r.snooze_count > 0 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              (Snoozed {r.snooze_count}x)
                            </span>
                          )}
                        </div>

                        {r.message && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.message}</p>
                        )}

                        <div className="flex items-center gap-4 text-[11px] text-slate-400 mt-2">
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatReminderDate(r.reminder_datetime)}
                          </span>
                          <span>Created {new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2 justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 flex-shrink-0">
                      {!r.is_completed && (
                        <>
                          {/* Snooze Button Group */}
                          <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
                            <button
                              onClick={() => handleSnoozeReminder(r.id, 10, null, null)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors"
                              title="Snooze 10 minutes"
                            >
                              +10m
                            </button>
                            <button
                              onClick={() => handleSnoozeReminder(r.id, null, 1, null)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors"
                              title="Snooze 1 hour"
                            >
                              +1h
                            </button>
                            <button
                              onClick={() => handleSnoozeReminder(r.id, null, null, 1)}
                              className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors"
                              title="Snooze 1 day"
                            >
                              +1d
                            </button>
                          </div>

                          {/* Complete button */}
                          <button
                            onClick={() => handleCompleteReminder(r.id)}
                            className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="Mark as Completed"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Edit button */}
                      <button
                        onClick={() => openEditModal(r)}
                        className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Edit Reminder"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Dismiss button */}
                      {!r.is_completed && !r.is_dismissed && (
                        <button
                          onClick={() => handleDismissReminder(r.id)}
                          className="p-1.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                          title="Dismiss Reminder"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteReminder(r.id)}
                        className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors"
                        title="Delete Reminder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ CREATE / EDIT MODAL ═══════════════════════ */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingReminder ? 'Edit Financial Reminder' : 'Set Financial Reminder'}
                </h3>
              </div>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReminder} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reminder Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Pay Rent, Credit Card Bill, Review Groceries Budget"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category & Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scheduled Date & Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date & Time <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.reminder_datetime}
                  onChange={(e) => setFormData({ ...formData, reminder_datetime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Note or Account Details (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Pay via HDFC Netbanking or check minimum amount due."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingReminder ? 'Update Reminder' : 'Save Reminder'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
