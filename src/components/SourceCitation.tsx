import React from 'react';
import { Bookmark } from 'lucide-react';
import { Citation } from '../types/autosar';

interface SourceCitationProps {
  citation: Citation;
  index: number;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citation, index }) => {
  return (
    <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100/90 space-y-2 hover:border-blue-200 transition-colors">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-medium text-blue-950 truncate">
          <Bookmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span className="text-blue-600 font-bold">[{index + 1}]</span>
          <span className="truncate">{citation.document}</span>
          <span className="text-blue-200">·</span>
          <span className="text-blue-800 font-semibold">Page {citation.page}</span>
          {citation.section && (
            <span className="text-slate-500 text-[11px]">({citation.section})</span>
          )}
        </div>

        <span className="text-[11px] text-blue-700 font-semibold shrink-0 ml-2 bg-blue-100/60 px-2 py-0.5 rounded">
          {(citation.relevance * 100).toFixed(0)}% match
        </span>
      </div>

      <p className="text-xs text-slate-700 leading-relaxed border-l-2 border-blue-600 pl-3 py-1 bg-white rounded-r">
        "{citation.snippet}"
      </p>
    </div>
  );
};
