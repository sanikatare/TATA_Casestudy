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
    blue: 'border-slate-200/90 hover:border-blue-400 bg-white hover:shadow-md',
    violet: 'border-slate-200/90 hover:border-purple-400 bg-white hover:shadow-md',
    green: 'border-slate-200/90 hover:border-emerald-400 bg-white hover:shadow-md',
    amber: 'border-slate-200/90 hover:border-amber-400 bg-white hover:shadow-md'
  };

  const iconBg = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    violet: 'bg-purple-50 border-purple-200 text-purple-700',
    green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700'
  };

  return (
    <div className={`p-6 rounded-2xl border transition-all duration-200 shadow-xs ${accentStyles[accentColor]}`}>
      <div className="flex items-center justify-between mb-3.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className={`p-2.5 rounded-xl border ${iconBg[accentColor]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <div className="text-3xl font-extrabold tracking-tight text-slate-900">
          {value}
        </div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            trend.isPositive
              ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
              : 'text-slate-600 bg-slate-50 border-slate-200'
          }`}>
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-600 mt-2 font-medium">
          {subtext}
        </p>
      )}
    </div>
  );
};
