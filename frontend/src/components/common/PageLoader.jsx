import React from 'react';
import { Loader2, Wallet } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-pulse">
          <Wallet className="w-7 h-7 text-emerald-400" />
        </div>
        <Loader2 className="w-20 h-20 text-emerald-500/40 animate-spin absolute" />
      </div>
      <p className="mt-5 text-xs font-semibold text-slate-400 tracking-wider uppercase animate-pulse">
        Loading BudgetBuddy...
      </p>
    </div>
  );
}
