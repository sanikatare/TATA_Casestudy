import React from 'react';

interface StatusBadgeProps {
  status: 'OPERATIONAL' | 'ONLINE' | 'CONNECTED' | 'HEALTHY' | 'INDEXED' | 'SUCCESS' | 'DEGRADED' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'OFFLINE' | 'NO_GROUNDING';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm' }) => {
  const norm = status.toUpperCase();

  let dotColor = 'bg-emerald-500';
  let textColor = 'text-emerald-800';
  let bgColor = 'bg-emerald-50';
  let borderColor = 'border-emerald-300';

  if (['OPERATIONAL', 'ONLINE', 'CONNECTED', 'HEALTHY', 'INDEXED', 'SUCCESS'].includes(norm)) {
    dotColor = 'bg-emerald-500';
    textColor = 'text-emerald-800';
    bgColor = 'bg-emerald-50/90';
    borderColor = 'border-emerald-300';
  } else if (['DEGRADED', 'PROCESSING', 'PENDING', 'NO_GROUNDING'].includes(norm)) {
    dotColor = 'bg-amber-500';
    textColor = 'text-amber-800';
    bgColor = 'bg-amber-50/90';
    borderColor = 'border-amber-300';
  } else if (['FAILED', 'OFFLINE'].includes(norm)) {
    dotColor = 'bg-rose-500';
    textColor = 'text-rose-800';
    bgColor = 'bg-rose-50/90';
    borderColor = 'border-rose-300';
  }

  const displayText = label || norm;

  return (
    <span
      className={`inline-flex items-center gap-2 font-bold rounded-full border shadow-2xs ${bgColor} ${borderColor} ${textColor} ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${dotColor} ${norm === 'PROCESSING' ? 'animate-pulse' : ''}`} />
      <span>{displayText}</span>
    </span>
  );
};
