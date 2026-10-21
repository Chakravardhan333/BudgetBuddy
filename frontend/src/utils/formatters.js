/**
 * Utility functions for timezone-aware date/time formatting,
 * currency display, and mutation event bus.
 */

export const SUPPORTED_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST • UTC+05:30)', short: 'IST' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)', short: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US / New York)', short: 'ET' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US / Los Angeles)', short: 'PT' },
  { value: 'Europe/London', label: 'London Time (GMT / BST)', short: 'BST' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)', short: 'CET' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST • UTC+04:00)', short: 'GST' },
  { value: 'Asia/Singapore', label: 'Singapore Standard Time (SGT)', short: 'SGT' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', short: 'AET' },
];

export const COMMON_TIMEZONES = SUPPORTED_TIMEZONES;

export const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
};

export const getTimezonePreference = () => {
  const stored = localStorage.getItem('budgetbuddy_timezone');
  if (stored) return stored;
  // Default to browser timezone or Asia/Kolkata
  return getBrowserTimezone();
};

export const setTimezonePreference = (tz) => {
  localStorage.setItem('budgetbuddy_timezone', tz);
  window.dispatchEvent(new CustomEvent('timezone:changed', { detail: { timezone: tz } }));
};

export const formatDateTime = (dateInput, timeZone = null) => {
  if (!dateInput) return '';
  const dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(dateObj.getTime())) return '';

  const tz = timeZone || getTimezonePreference();
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(dateObj);
  } catch {
    return dateObj.toLocaleString();
  }
};

export const formatDate = (dateInput, timeZone = null) => {
  if (!dateInput) return '';
  // If YYYY-MM-DD string, construct with noon UTC to prevent timezone boundary date shifts
  let dateObj;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [y, m, d] = dateInput.split('-').map(Number);
    dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  } else {
    dateObj = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  }
  if (isNaN(dateObj.getTime())) return '';

  const tz = timeZone || getTimezonePreference();
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  } catch {
    return dateObj.toLocaleDateString();
  }
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
  JPY: '¥',
};

export const formatCurrency = (amount, symbolOrCurrency = '$', optionalCurrency = null) => {
  const val = parseFloat(amount || 0);
  let symbol = symbolOrCurrency || '$';
  let currency = optionalCurrency || 'USD';

  if (CURRENCY_SYMBOLS[symbolOrCurrency]) {
    currency = symbolOrCurrency;
    symbol = CURRENCY_SYMBOLS[symbolOrCurrency];
  } else if (symbolOrCurrency === '₹') {
    currency = 'INR';
  }

  const locale = (currency === 'INR' || symbol === '₹') ? 'en-IN' : 'en-US';
  try {
    const formattedNum = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(val));
    return `${val < 0 ? '-' : ''}${symbol}${formattedNum}`;
  } catch {
    return `${val < 0 ? '-' : ''}${symbol}${Math.abs(val).toFixed(2)}`;
  }
};

/**
 * Dispatches a lightweight cross-component mutation event
 * so all active dashboard cards, tables, and notification counters
 * synchronize with backend state immediately.
 */
export const notifyFinanceMutation = (entity, action) => {
  window.dispatchEvent(new CustomEvent('finance:mutation', { detail: { entity, action } }));
  // Also notify notifications service to update unread badge
  window.dispatchEvent(new CustomEvent('notifications:updated'));
};
