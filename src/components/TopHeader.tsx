import React from 'react';
import { ShieldCheck, Sparkles } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface TopHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ title, description, action }) => {
  return (
    <header className="h-20 px-8 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 z-30 shadow-[0_1px_8px_rgba(15,23,42,0.03)]">
      <div>
        <div className="flex items-center gap-3.5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          <StatusBadge status="OPERATIONAL" label="Live Stack" size="sm" />
        </div>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-5">
        {action}

        {/* Global Security / Compliance Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="font-semibold">ISO 26262 ASIL-D</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">AUTOSAR 4.4</span>
        </div>

        {/* Grounding guarantee badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="font-semibold">100% Page Verified Citations</span>
        </div>

        {/* User profile avatar */}
        <div className="flex items-center gap-3.5 pl-4 border-l border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shadow-xs">
            AE
          </div>
          <div className="hidden sm:block text-left text-xs">
            <div className="font-bold text-slate-900 leading-tight">Automotive Architect</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Software & Systems Lead</div>
          </div>
        </div>
      </div>
    </header>
  );
};
