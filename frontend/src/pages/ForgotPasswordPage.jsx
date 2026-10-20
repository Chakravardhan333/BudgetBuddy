import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Wallet, Mail, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-emerald-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="flex justify-center mb-6">
          <NavLink to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">
              BudgetBuddy
            </span>
          </NavLink>
        </div>

        <div className="bg-slate-900 py-8 px-6 sm:px-10 rounded-2xl border border-slate-800 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-2">Reset your password</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Enter the email address registered with your account and we will send you password recovery instructions.
          </p>

          {submitted ? (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-200">Recovery email sent</p>
                  <p className="text-xs text-emerald-300/90 mt-1">
                    If an account exists for <span className="font-mono font-bold">{email}</span>, you will receive password reset steps shortly.
                  </p>
                </div>
              </div>

              <NavLink
                to="/login"
                className="w-full mt-4 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </NavLink>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@budgetbuddy.app"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <span>Send Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <NavLink
                  to="/login"
                  className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </NavLink>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
