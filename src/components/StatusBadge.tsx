import React from 'react';

interface StatusBadgeProps {
  status: 'OPERATIONAL' | 'ONLINE' | 'CONNECTED' | 'HEALTHY' | 'INDEXED' | 'SUCCESS' | 'DEGRADED' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'OFFLINE' | 'NO_GROUNDING' | 'ABSTAINED';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm' }) => {
  const norm = status.toUpperCase();

  // Strict Blue & White Palette
  let dotColor = 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)]';
  let textColor = 'text-blue-800';

  if (['OPERATIONAL', 'ONLINE', 'CONNECTED', 'HEALTHY', 'INDEXED', 'SUCCESS'].includes(norm)) {
    dotColor = 'bg-blue-600 shadow-[0_0_6px_rgba(37,99,235,0.4)]';
    textColor = 'text-blue-700';
  } else if (['DEGRADED', 'PROCESSING', 'PENDING', 'NO_GROUNDING', 'ABSTAINED'].includes(norm)) {
    dotColor = 'bg-sky-400';
    textColor = 'text-sky-700';
  } else if (['FAILED', 'OFFLINE'].includes(norm)) {
    dotColor = 'bg-slate-400';
    textColor = 'text-slate-600';
  }

  const displayText = label || norm;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${textColor} ${
        size === 'sm' ? 'text-[11px]' : 'text-xs'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} ${['PROCESSING', 'ONLINE', 'OPERATIONAL'].includes(norm) ? 'animate-pulse' : ''}`} />
      <span>{displayText}</span>
    </span>
  );
};
