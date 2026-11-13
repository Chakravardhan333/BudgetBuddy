import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { notificationsService } from '../../api/notifications';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  CalendarClock,
  PieChart,
  TrendingDown,
  Target,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Layers,
  Loader2,
  ExternalLink,
  X
} from 'lucide-react';

const CATEGORY_META = {
  all: { label: 'All', icon: Layers, color: 'text-slate-600', bg: 'bg-slate-100' },
  reminders: { label: 'Reminders', icon: CalendarClock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  payments: { label: 'Payments', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  budgets: { label: 'Budgets', icon: PieChart, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  expenses: { label: 'Expenses', icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-200' },
  system: { label: 'System', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200' },
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationCenterDropdown({ unreadCount = 0, onCountChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications in dropdown:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (onCountChange) onCountChange();
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  // Delete single notification
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (onCountChange) onCountChange();
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead(categoryFilter === 'all' ? null : categoryFilter);
      setNotifications((prev) =>
        prev.map((n) =>
          categoryFilter === 'all' || n.category === categoryFilter ? { ...n, is_read: true } : n
        )
      );
      if (onCountChange) onCountChange();
      window.dispatchEvent(new Event('notifications:updated'));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  // Handle clicking on notification card: mark as read and navigate
  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await notificationsService.markAsRead(notif.id);
        if (onCountChange) onCountChange();
        window.dispatchEvent(new Event('notifications:updated'));
      } catch {
        // silent
      }
    }
    setIsOpen(false);

    // Navigate to relevant link
    let targetLink = notif.link;
    if (!targetLink) {
      switch (notif.category) {
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

  // Filtered notifications in dropdown
  const filteredList = notifications.filter((n) => {
    if (categoryFilter === 'all') return true;
    return (n.category || 'system') === categoryFilter;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Navbar Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-slate-600 hover:bg-slate-100 relative transition-colors focus:outline-none"
        title="Notification Center"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white animate-in zoom-in-75">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Modern Notification Center Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-[380px] sm:w-[440px] max-w-[92vw] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col text-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold leading-tight">Notification Center</h3>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All notifications caught up'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-300 transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close notifications"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
              const Icon = meta.icon;
              const isActive = categoryFilter === catKey;
              return (
                <button
                  key={catKey}
                  onClick={() => setCategoryFilter(catKey)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>

          {/* Notification List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                <span className="text-xs">Loading live notifications...</span>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">No notifications found</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {categoryFilter === 'all'
                    ? 'You have zero notifications stored right now.'
                    : `No notifications under ${CATEGORY_META[categoryFilter]?.label || categoryFilter}.`}
                </p>
              </div>
            ) : (
              filteredList.slice(0, 10).map((n) => {
                const cat = CATEGORY_META[n.category] || CATEGORY_META.system;
                const CatIcon = cat.icon;

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 hover:bg-slate-50/80 transition-colors cursor-pointer group flex items-start gap-3 ${
                      !n.is_read ? 'bg-emerald-50/20' : 'bg-white'
                    }`}
                  >
                    {/* Category Icon */}
                    <div className={`w-8 h-8 rounded-xl ${cat.bg} ${cat.color} flex items-center justify-center flex-shrink-0 mt-0.5 border shadow-2xs`}>
                      <CatIcon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className={`text-xs font-bold truncate ${!n.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                            {n.title}
                          </h4>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                          {formatTimeAgo(n.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
                        <span className="text-[10px] font-semibold text-emerald-600 group-hover:underline flex items-center gap-0.5">
                          <span>View Details</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>

                        {/* Card Action Buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          {!n.is_read && (
                            <button
                              onClick={(e) => handleMarkRead(e, n.id)}
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, n.id)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete notification"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-500 pl-2">
              Stored persistently in Django
            </span>
            <NavLink
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-xs"
            >
              <span>Full Center</span>
              <ExternalLink className="w-3 h-3" />
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );
}
