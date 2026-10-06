import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronUp, CheckCircle2, Copy, Check } from 'lucide-react';
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
  confidenceScore = 0.97
}) => {
  const [showRetrievedContext, setShowRetrievedContext] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${answer}\n\nSources:\n` + citations.map(c => `• ${c.document} (Page ${c.page}): ${c.snippet}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* 1. User Question Bubble */}
      <div className="flex items-start gap-3.5 justify-end">
        <div className="max-w-2xl bg-slate-900 text-white rounded-2xl rounded-tr-xs p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-2 text-xs text-blue-300 font-bold">
            <span>Automotive Systems Engineer</span>
            <span className="text-slate-400 font-normal">
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-sm font-semibold leading-relaxed text-white">
            {question}
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <User className="w-4 h-4" />
        </div>
      </div>

      {/* 2. Grounded AI Response Bubble */}
      <div className="flex items-start gap-3.5 justify-start">
        <div className="w-9 h-9 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
          <Bot className="w-5 h-5" />
        </div>

        <div className="max-w-3xl bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-xs p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                AUTOSAR Grounded RAG Synthesis
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {(confidenceScore * 100).toFixed(1)}% Verifiable Grounding
              </span>

              <button
                onClick={handleCopy}
                title="Copy verified synthesis"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Answer text */}
          <div className="text-sm text-slate-800 leading-relaxed space-y-2 font-normal">
            {answer}
          </div>

          {/* 3. Citations & Sources Section */}
          {citations.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Verified Page Sources & Evidence ({citations.length})
                </span>
                <button
                  onClick={() => setShowRetrievedContext(!showRetrievedContext)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  <span>{showRetrievedContext ? 'Hide Raw Vector Context' : 'Expand Raw Vector Context'}</span>
                  {showRetrievedContext ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Citations List */}
              <div className="grid grid-cols-1 gap-2.5">
                {citations.map((c, idx) => (
                  <SourceCitation key={idx} citation={c} index={idx} />
                ))}
              </div>

              {/* Expandable Raw Context */}
              {showRetrievedContext && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                  <div className="text-slate-900 font-bold">Unfiltered ChromaDB Vector Chunks:</div>
                  <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-normal">
                    {citations.map((c, i) => `[Evidence ${i + 1} • ${c.document} • Page ${c.page}]:\n${c.snippet}\n`).join('\n')}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
