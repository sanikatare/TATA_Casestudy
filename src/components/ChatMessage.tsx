import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
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
    navigator.clipboard.writeText(
      `${answer}\n\nSources:\n` + citations.map(c => `• ${c.document} (Page ${c.page}): ${c.snippet}`).join('\n')
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* User Bubble */}
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-2xl bg-gradient-to-br from-blue-900 to-blue-800 text-white rounded-xl p-4 shadow-2xs border border-blue-800/80">
          <div className="flex items-center justify-between gap-4 mb-1 text-xs text-sky-200/80">
            <span className="font-semibold text-white">You</span>
            <span>
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium leading-relaxed text-blue-50">
            {question}
          </p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-blue-950 text-white flex items-center justify-center shrink-0 border border-blue-800">
          <User className="w-4 h-4 text-sky-300" />
        </div>
      </div>

      {/* Assistant Bubble */}
      <div className="flex items-start gap-3 justify-start">
        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/30">
          <Bot className="w-4 h-4" />
        </div>

        <div className="max-w-3xl bg-white border border-blue-100/90 text-slate-800 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-blue-50">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-950">
              <span>Assistant</span>
              <span className="text-blue-200">·</span>
              <span className="text-blue-600 font-semibold text-[11px] bg-blue-50 px-2 py-0.5 rounded">
                {(confidenceScore * 100).toFixed(0)}% Confidence
              </span>
            </div>

            <button
              onClick={handleCopy}
              title="Copy response"
              className="p-1 rounded-md text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Answer text */}
          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal whitespace-pre-line">
            {answer}
          </div>

          {/* Citations */}
          {citations.length > 0 && (
            <div className="pt-3 border-t border-blue-50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-950">
                  Citations ({citations.length})
                </span>
                <button
                  onClick={() => setShowRetrievedContext(!showRetrievedContext)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors cursor-pointer font-semibold"
                >
                  <span>{showRetrievedContext ? 'Hide Context' : 'View Context'}</span>
                  {showRetrievedContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {citations.map((c, idx) => (
                  <SourceCitation key={idx} citation={c} index={idx} />
                ))}
              </div>

              {showRetrievedContext && (
                <div className="p-3 rounded-lg bg-blue-950 text-blue-100 text-xs font-mono space-y-2 mt-2 border border-blue-900">
                  <div className="text-sky-300 font-medium">Pipeline Context Trace:</div>
                  <div className="space-y-1 text-[11px] text-blue-200/90 max-h-48 overflow-y-auto">
                    {citations.map((c, i) => (
                      <div key={i} className="border-b border-blue-900/60 pb-1.5 last:border-b-0">
                        <span className="text-sky-300 font-bold">[{c.document}]</span> Page {c.page} · {c.section || 'General'}
                        <p className="text-blue-100/70 mt-0.5 line-clamp-2">{c.snippet}</p>
                      </div>
                    ))}
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
