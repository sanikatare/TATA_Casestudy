import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { SourceCitation } from './SourceCitation';
import { Citation } from '../types/autosar';

interface ChatMessageProps {
  question: string;
  answer: string;
  timestamp: string;
  citations: Citation[];
  confidenceScore?: number;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  question,
  answer,
  timestamp,
  citations,
  confidenceScore = 0.95
}) => {
  const [showRetrievedContext, setShowRetrievedContext] = useState(false);

  return (
    <div className="space-y-4">
      {/* 1. User Question Bubble */}
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-2xl bg-blue-50 border border-blue-200 text-slate-800 rounded-xl rounded-tr-none p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-4 mb-1 text-[11px] text-blue-700 font-mono font-medium">
            <span>Automotive Engineer</span>
            <span>{new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-900">
            {question}
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
          <User className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Grounded AI Response Bubble */}
      <div className="flex items-start gap-3 justify-start">
        <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
          <Bot className="w-4 h-4" />
        </div>

        <div className="max-w-3xl bg-white border border-slate-200 text-slate-800 rounded-xl rounded-tl-none p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between text-xs font-mono pb-2 border-b border-slate-100">
            <span className="text-purple-700 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600" />
              AUTOSAR Grounded RAG Synthesis
            </span>
            <span className="text-emerald-700 flex items-center gap-1 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {(confidenceScore * 100).toFixed(1)}% Grounded
            </span>
          </div>

          {/* Answer text */}
          <div className="text-sm text-slate-700 leading-relaxed space-y-2 font-sans">
            {answer}
          </div>

          {/* 3. Citations & Sources Section */}
          {citations.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Sources & Evidence ({citations.length})
                </span>
                <button
                  onClick={() => setShowRetrievedContext(!showRetrievedContext)}
                  className="flex items-center gap-1 text-[11px] font-mono text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                >
                  <span>{showRetrievedContext ? 'Hide Retrieved Context' : 'Expand Retrieved Context'}</span>
                  {showRetrievedContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Citations List */}
              <div className="grid grid-cols-1 gap-2">
                {citations.map((c, idx) => (
                  <SourceCitation key={idx} citation={c} index={idx} />
                ))}
              </div>

              {/* Expandable Raw Context */}
              {showRetrievedContext && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 space-y-2">
                  <div className="text-slate-800 font-bold">Unfiltered Vector Database Chunks:</div>
                  <pre className="text-[11px] text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {citations.map((c, i) => `[Source ${i + 1} - Page ${c.page}]:\n${c.snippet}\n`).join('\n')}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
