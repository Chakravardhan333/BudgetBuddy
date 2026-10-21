import React, { useState, useEffect } from 'react';
import { Clock, Globe } from 'lucide-react';
import {
  getTimezonePreference,
  setTimezonePreference,
  SUPPORTED_TIMEZONES,
  getBrowserTimezone,
} from '../../utils/formatters';

export default function LiveClock({ showTimezoneSelector = false, className = '' }) {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [selectedTz, setSelectedTz] = useState(() => getTimezonePreference());
  const [selectorOpen, setSelectorOpen] = useState(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const handleTzChange = (e) => {
      if (e.detail?.timezone) {
        setSelectedTz(e.detail.timezone);
      }
    };

    window.addEventListener('timezone:changed', handleTzChange);

    return () => {
      clearInterval(timer);
      window.removeEventListener('timezone:changed', handleTzChange);
    };
  }, []);

  // Format date and time according to selected timezone
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    timeZone: selectedTz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(currentTime);

  const formattedTime = new Intl.DateTimeFormat('en-US', {
    timeZone: selectedTz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(currentTime);

  // Get short timezone badge label (e.g. IST, UTC, ET)
  const currentTzObj = SUPPORTED_TIMEZONES.find((t) => t.value === selectedTz);
  const tzShort = currentTzObj?.short || (selectedTz.includes('Kolkata') ? 'IST' : 'TZ');

  const handleSelectTz = (tzValue) => {
    setSelectedTz(tzValue);
    setTimezonePreference(tzValue);
    setSelectorOpen(false);
  };

  return (
    <div className={`relative inline-flex items-center text-xs ${className}`}>
      <div
        onClick={() => setSelectorOpen(!selectorOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white border border-slate-700/60 shadow-xs cursor-pointer hover:bg-slate-800 transition-colors select-none"
        title={`Live Clock • Timezone: ${selectedTz}. Click to toggle timezone.`}
      >
        <Clock className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        <span className="font-medium text-slate-300 hidden sm:inline">{formattedDate}</span>
        <span className="text-slate-400 hidden sm:inline">•</span>
        <span className="font-mono font-semibold tracking-wider text-emerald-300">{formattedTime}</span>
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
          {tzShort}
        </span>
      </div>

      {selectorOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectorOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs animate-in fade-in zoom-in-95">
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Select Display Timezone
              </span>
            </div>

            <div className="max-h-56 overflow-y-auto py-1">
              {/* Option to use browser timezone */}
              <button
                type="button"
                onClick={() => handleSelectTz(getBrowserTimezone())}
                className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  selectedTz === getBrowserTimezone() ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700'
                }`}
              >
                <span>Browser Local ({getBrowserTimezone()})</span>
                {selectedTz === getBrowserTimezone() && <span className="text-emerald-600 font-bold">✓</span>}
              </button>

              {/* Standard timezones */}
              {SUPPORTED_TIMEZONES.map((tz) => (
                <button
                  key={tz.value}
                  type="button"
                  onClick={() => handleSelectTz(tz.value)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    selectedTz === tz.value ? 'bg-emerald-50 text-emerald-800 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="font-medium truncate">{tz.label}</div>
                  </div>
                  {selectedTz === tz.value && <span className="text-emerald-600 font-bold">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
