import React from 'react';
import { Citation } from '../types/autosar';

interface SourceCitationProps {
  citation: Citation;
  index: number;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citation, index }) => {
  return (
    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900 font-mono">
            <span className="text-blue-600">Source {index + 1}</span>
            <span className="text-slate-400">·</span>
            <span className="truncate max-w-[240px] text-slate-800">{citation.document}</span>
          </div>
          <div className="text-[11px] text-blue-600 font-mono font-medium">
            Page {citation.page} {citation.section && <span className="text-slate-500 font-sans">({citation.section})</span>}
          </div>
        </div>

        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
          Relevance: {(citation.relevance * 100).toFixed(1)}%
        </span>
      </div>

      <p className="text-xs text-slate-700 font-sans leading-relaxed border-l-2 border-blue-500 pl-2.5 py-1 bg-white rounded-r shadow-2xs">
        "{citation.snippet}"
      </p>

      {citation.chunk_id && (
        <div className="text-[10px] text-slate-400 font-mono">
          Vector Chunk: {citation.chunk_id}
        </div>
      )}
    </div>
  );
};
