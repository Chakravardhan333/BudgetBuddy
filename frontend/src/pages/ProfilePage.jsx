import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  Loader2
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUserProfile, changePassword } = useAuth();

  // Profile Form State
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    bio: user?.bio || '',
    currency: user?.currency || 'USD',
  });

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    new_password_confirm: '',
  });

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
    { code: 'EUR', symbol: '€', name: 'Euro (€)' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
    { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)' },
  ];

  const handleProfileChange = (e) => {
    setProfileData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setProfileSuccess('');
    setProfileError('');
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    const res = await updateUserProfile(profileData);
    setProfileLoading(false);

    if (res.success) {
      setProfileSuccess('Profile details and currency updated successfully!');
    } else {
      setProfileError('Failed to update profile. Please check your inputs.');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.new_password_confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    setPasswordLoading(true);
    setPasswordSuccess('');
    setPasswordError('');

    const res = await changePassword(
      passwordData.old_password,
      passwordData.new_password,
      passwordData.new_password_confirm
    );
    setPasswordLoading(false);

    if (res.success) {
      setPasswordSuccess('Password updated successfully!');
      setPasswordData({
        old_password: '',
        new_password: '',
        new_password_confirm: '',
      });
    } else {
      setPasswordError(res.error || 'Failed to update password.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          User Profile & Preferences
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your personal information, base reporting currency, and security credentials.
        </p>
      </div>

      {/* Profile Details Form */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg border border-emerald-500/20">
            {user?.first_name?.[0] || user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {user?.full_name || user?.username}
            </h2>
            <p className="text-xs text-slate-500 capitalize">
              Role: <span className="font-semibold text-emerald-600">{user?.role}</span> &bull; Username: <span className="font-mono">{user?.username}</span>
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div className="mt-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="mt-6 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={profileData.first_name}
                onChange={handleProfileChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={profileData.last_name}
                onChange={handleProfileChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={profileData.email}
                onChange={handleProfileChange}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="text"
                name="phone_number"
                value={profileData.phone_number}
                onChange={handleProfileChange}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Preferred Currency
            </label>
            <select
              name="currency"
              value={profileData.currency}
              onChange={handleProfileChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              All transactions, budgets, and dashboard metrics will format with this currency symbol.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Bio / Notes
            </label>
            <textarea
              name="bio"
              rows={3}
              value={profileData.bio}
              onChange={handleProfileChange}
              placeholder="e.g. Computer Science student budgeting for graduation and tech goals."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {profileLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <KeyRound className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-semibold text-slate-900">
            Change Password
          </h2>
        </div>

        {passwordSuccess && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
              Current Password
            </label>
            <input
              type="password"
              required
              value={passwordData.old_password}
              onChange={(e) => setPasswordData((prev) => ({ ...prev, old_password: e.target.value }))}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                New Password (Min 8 chars)
              </label>
              <input
                type="password"
                required
                value={passwordData.new_password}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, new_password: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordData.new_password_confirm}
                onChange={(e) => setPasswordData((prev) => ({ ...prev, new_password_confirm: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm transition-colors shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
