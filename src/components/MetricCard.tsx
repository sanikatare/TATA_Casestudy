import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: 'blue' | 'violet' | 'green' | 'amber';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  accentColor = 'blue'
}) => {
  const accentStyles = {
    blue: 'border-slate-200 hover:border-blue-300 text-blue-600 bg-blue-50/50',
    violet: 'border-slate-200 hover:border-purple-300 text-purple-600 bg-purple-50/50',
    green: 'border-slate-200 hover:border-emerald-300 text-emerald-600 bg-emerald-50/50',
    amber: 'border-slate-200 hover:border-amber-300 text-amber-600 bg-amber-50/50'
  };

  const iconBg = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    violet: 'bg-purple-50 border-purple-200 text-purple-600',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600'
  };

  return (
    <div className={`p-5 rounded-xl bg-white border border-slate-200 transition-all duration-200 shadow-xs hover:shadow-sm ${accentStyles[accentColor]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          {label}
        </span>
        <div className={`p-2 rounded-lg border ${iconBg[accentColor]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
          {value}
        </div>
        {trend && (
          <span className={`text-xs font-mono font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-slate-500'}`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-600 mt-1 font-sans">
          {subtext}
        </p>
      )}
    </div>
  );
};
