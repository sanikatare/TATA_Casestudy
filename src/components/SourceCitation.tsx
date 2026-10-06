import React from 'react';
import { FileText, Bookmark } from 'lucide-react';
import { Citation } from '../types/autosar';

interface SourceCitationProps {
  citation: Citation;
  index: number;
}

export const SourceCitation: React.FC<SourceCitationProps> = ({ citation, index }) => {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-slate-300 transition-colors space-y-2.5 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Bookmark className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="text-blue-700">Source Evidence #{index + 1}</span>
            <span className="text-slate-300">·</span>
            <span className="truncate max-w-[280px] text-slate-800">{citation.document}</span>
          </div>
          <div className="text-xs text-blue-800 font-bold flex items-center gap-2">
            <span>Page {citation.page}</span>
            {citation.section && (
              <span className="text-slate-600 font-normal">({citation.section})</span>
            )}
          </div>
        </div>

        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
          Relevance: {(citation.relevance * 100).toFixed(1)}%
        </span>
      </div>

      <p className="text-xs text-slate-800 leading-relaxed border-l-3 border-blue-600 pl-3.5 py-1.5 bg-white rounded-r-lg shadow-2xs italic font-normal">
        "{citation.snippet}"
      </p>

      {citation.chunk_id && (
        <div className="text-[10px] text-slate-400">
          Vector Chunk ID: {citation.chunk_id}
        </div>
      )}
    </div>
  );
};
