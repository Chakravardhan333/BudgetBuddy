import React from 'react';
import { Loader2 } from 'lucide-react';
import budgetBuddyLogo from '../../assets/logo.png';

export default function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center">
        <div className="w-16 h-16 flex items-center justify-center animate-pulse">
          <img
            src={budgetBuddyLogo}
            alt="BudgetBuddy Loading Mascot"
            className="w-14 h-14 object-contain drop-shadow"
          />
        </div>
        <Loader2 className="w-24 h-24 text-emerald-500/40 animate-spin absolute" />
      </div>
      <p className="mt-5 text-xs font-semibold text-emerald-400 tracking-wider uppercase animate-pulse">
        Loading BudgetBuddy...
      </p>
    </div>
  );
}
