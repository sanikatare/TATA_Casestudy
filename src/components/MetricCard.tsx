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
  accentColor?: 'blue' | 'sky' | 'navy' | 'indigo' | 'violet' | 'green' | 'amber';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  accentColor = 'blue'
}) => {
  // Pure blue and white shades
  const iconColors: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50 border border-blue-100',
    sky: 'text-sky-600 bg-sky-50 border border-sky-100',
    navy: 'text-blue-900 bg-blue-100/60 border border-blue-200/60',
    indigo: 'text-blue-700 bg-blue-50 border border-blue-100',
    violet: 'text-blue-600 bg-blue-50 border border-blue-100',
    green: 'text-blue-600 bg-blue-50 border border-blue-100',
    amber: 'text-sky-600 bg-sky-50 border border-sky-100'
  };

  const selectedColor = iconColors[accentColor] || iconColors.blue;

  return (
    <div className="p-5 rounded-xl border border-blue-100/90 bg-white hover:border-blue-300 hover:shadow-xs transition-all duration-150 group">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 group-hover:text-blue-950 transition-colors">
          {label}
        </span>
        <div className={`p-2 rounded-lg transition-transform group-hover:scale-105 duration-150 ${selectedColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <div className="text-2xl font-bold tracking-tight text-blue-950">
          {value}
        </div>
        {trend && (
          <span className="text-xs font-semibold text-blue-600 flex items-center gap-0.5">
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <div className="text-xs text-slate-500 mt-2 font-normal">
          {subtext}
        </div>
      )}
    </div>
  );
};
