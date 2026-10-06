import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface TopHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ title, description, action }) => {
  return (
    <header className="h-18 px-8 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-30 shadow-xs">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">
            {title}
          </h1>
          <StatusBadge status="OPERATIONAL" label="Live" size="sm" />
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {action}

        {/* Global Security / Compliance Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>ISO 26262 ASIL-D</span>
        </div>

        {/* User profile avatar */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-mono text-xs font-bold">
            AE
          </div>
          <div className="hidden sm:block text-left text-xs">
            <div className="font-semibold text-slate-900 leading-none">Automotive Engineer</div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">ECU Architect</div>
          </div>
        </div>
      </div>
    </header>
  );
};
