import React from 'react';

interface StatusBadgeProps {
  status: 'OPERATIONAL' | 'ONLINE' | 'CONNECTED' | 'HEALTHY' | 'INDEXED' | 'SUCCESS' | 'DEGRADED' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'OFFLINE' | 'NO_GROUNDING';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm' }) => {
  const norm = status.toUpperCase();

  let dotColor = 'bg-emerald-500';
  let textColor = 'text-emerald-700';
  let bgColor = 'bg-emerald-50';
  let borderColor = 'border-emerald-200';

  if (['OPERATIONAL', 'ONLINE', 'CONNECTED', 'HEALTHY', 'INDEXED', 'SUCCESS'].includes(norm)) {
    dotColor = 'bg-emerald-500';
    textColor = 'text-emerald-700';
    bgColor = 'bg-emerald-50';
    borderColor = 'border-emerald-200';
  } else if (['DEGRADED', 'PROCESSING', 'PENDING', 'NO_GROUNDING'].includes(norm)) {
    dotColor = 'bg-amber-500';
    textColor = 'text-amber-700';
    bgColor = 'bg-amber-50';
    borderColor = 'border-amber-200';
  } else if (['FAILED', 'OFFLINE'].includes(norm)) {
    dotColor = 'bg-red-500';
    textColor = 'text-red-700';
    bgColor = 'bg-red-50';
    borderColor = 'border-red-200';
  }

  const displayText = label || norm;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium rounded-full border ${bgColor} ${borderColor} ${textColor} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${norm === 'PROCESSING' ? 'animate-pulse' : ''}`} />
      <span>{displayText}</span>
    </span>
  );
};
