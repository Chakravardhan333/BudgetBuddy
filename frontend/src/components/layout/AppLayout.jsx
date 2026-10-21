import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsService } from '../../api/notifications';
import LiveClock from '../common/LiveClock';
import budgetBuddyLogo from '../../assets/logo.png';
import {
  Wallet,
  LayoutDashboard,
  ArrowLeftRight,
  TrendingDown,
  TrendingUp,
  PieChart,
  Target,
  BarChart3,
  FileSpreadsheet,
  Bell,
  User,
  Settings,
  ShieldAlert,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CreditCard
} from 'lucide-react';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkUnread = async () => {
      try {
        const data = await notificationsService.getUnreadCount();
        setUnreadCount(data.unread_count || 0);
      } catch {
        // Silently skip if network error
      }
    };
    checkUnread();

    window.addEventListener('notifications:updated', checkUnread);
    window.addEventListener('finance:mutation', checkUnread);
    return () => {
      window.removeEventListener('notifications:updated', checkUnread);
      window.removeEventListener('finance:mutation', checkUnread);
    };
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Expenses', path: '/expenses', icon: TrendingDown },
    { name: 'Income', path: '/income', icon: TrendingUp },
    { name: 'Monthly Budget', path: '/budgets', icon: PieChart },
    { name: 'Savings Goals', path: '/goals', icon: Target },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Reports & Export', path: '/reports', icon: FileSpreadsheet },
    { name: 'Notifications', path: '/notifications', icon: Bell },
  ];

  const secondaryNav = [
    { name: 'User Profile', path: '/profile', icon: User },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  if (user?.role === 'admin' || user?.is_superuser) {
    secondaryNav.unshift({ name: 'Admin Portal', path: '/admin-portal', icon: ShieldAlert });
  }

  const roleBadgeColors = {
    student: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    premium: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    admin: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col md:flex-row antialiased">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Dark Navy Fintech Style */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0f172a] text-slate-200 border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
            <NavLink to="/dashboard" className="flex items-center gap-2.5">
              <img
                src={budgetBuddyLogo}
                alt="BudgetBuddy Logo"
                className="w-10 h-10 object-contain drop-shadow"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg text-white tracking-tight leading-none">
                  BudgetBuddy
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase mt-1">
                  Personal Finance
                </span>
              </div>
            </NavLink>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Status Card */}
          <div className="px-4 py-4">
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30 flex-shrink-0">
                  {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="truncate">
                  <div className="text-sm font-semibold text-white truncate">
                    {user?.full_name || user?.username}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="capitalize">{user?.role || 'student'} tier</span>
                  </div>
                </div>
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${roleBadgeColors[user?.role || 'student']}`}>
                {user?.currency_symbol || '$'} {user?.currency || 'USD'}
              </span>
            </div>
          </div>

          {/* Primary Navigation */}
          <div className="px-3 py-2 space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Financial Core
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          {/* Settings & Admin Navigation */}
          <div className="px-3 pt-4 space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Preferences
            </div>
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick Breadcrumb or Page Header */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">BudgetBuddy</span>
              <span>/</span>
              <span className="capitalize font-medium text-emerald-600">
                {location.pathname.replace('/', '') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-time Clock Component */}
            <LiveClock />

            {/* Currency Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
              <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
              <span>{user?.currency || 'USD'} ({user?.currency_symbol || '$'})</span>
            </div>

            {/* Notifications Shortcut */}
            <NavLink
              to="/notifications"
              className="p-2 rounded-full text-slate-600 hover:bg-slate-100 relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </NavLink>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize leading-tight">
                    {user?.role || 'student'}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs text-slate-500">Signed in as</p>
                    <p className="text-xs font-semibold text-slate-800 truncate">{user?.email || user?.username}</p>
                  </div>
                  <NavLink
                    to="/profile"
                    className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>My Profile</span>
                  </NavLink>
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Account Settings</span>
                  </NavLink>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Nested Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
