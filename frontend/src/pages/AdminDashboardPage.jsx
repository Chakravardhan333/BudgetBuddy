import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Users, Database, Activity, CheckCircle2 } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const systemStats = [
    { label: 'Registered Users', val: '3', sub: 'Student, Premium, Admin' },
    { label: 'Database Status', val: 'Healthy', sub: 'SQLite / Django ORM' },
    { label: 'API Health', val: '200 OK', sub: 'StatReloader active' },
    { label: 'Security Protocols', val: 'SimpleJWT', sub: 'Bearer auth enforced' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Privileged Portal</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          System Administration & Monitoring
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          High-level tenant metrics, user roles, security audits, and application health.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemStats.map((s) => (
          <div key={s.label} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</span>
            <div className="text-2xl font-bold text-slate-900 mt-2">{s.val}</div>
            <div className="text-xs text-slate-400 mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Users Overview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600" />
            <span>Active Demonstration Users</span>
          </h2>
          <span className="text-xs text-slate-400">Database seeded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider border-b border-slate-100 font-semibold">
              <tr>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role Tier</th>
                <th className="py-3 px-4">Base Currency</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-mono font-medium">demo_student</td>
                <td className="py-3 px-4">student@budgetbuddy.app</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Student
                  </span>
                </td>
                <td className="py-3 px-4 font-semibold">USD ($)</td>
                <td className="py-3 px-4 text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-medium">demo_premium</td>
                <td className="py-3 px-4">premium@budgetbuddy.app</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                    Premium
                  </span>
                </td>
                <td className="py-3 px-4 font-semibold">USD ($)</td>
                <td className="py-3 px-4 text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono font-medium">admin</td>
                <td className="py-3 px-4">admin@budgetbuddy.app</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
                    Admin
                  </span>
                </td>
                <td className="py-3 px-4 font-semibold">USD ($)</td>
                <td className="py-3 px-4 text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Superuser
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
