import React, { useState, useEffect } from 'react';
import { FileText, ChevronRight, X, Search, BookmarkCheck } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { SourceCitation } from '../components/SourceCitation';
import { getHistory } from '../services/api';
import { QueryRecord } from '../types/autosar';

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<QueryRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<QueryRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    async function load() {
      const records = await getHistory();
      setHistoryItems(records);
    }
    load();
  }, []);

  const filteredItems = historyItems.filter(item =>
    item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.document_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Query Audit Trail & Grounding History
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Complete audit trail of architectural queries, retrieved vector chunks, and grounded responses.
          </p>
        </div>

        {/* Search filter input */}
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search queries or documents..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs font-medium"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/90 text-slate-700 border-b border-slate-200/90 uppercase tracking-wider text-[11px] font-bold">
            <tr>
              <th className="py-4 px-5">Engineering Inquiry</th>
              <th className="py-4 px-5">Target Document</th>
              <th className="py-4 px-5">Timestamp</th>
              <th className="py-4 px-5">Verified Sources</th>
              <th className="py-4 px-5">Status</th>
              <th className="py-4 px-5 text-right">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500 font-medium">
                  No historical queries match your search query.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedRecord(item)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-4 px-5 max-w-md">
                    <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate text-xs">
                      {item.question}
                    </div>
                  </td>

                  <td className="py-4 px-5 text-slate-700 font-medium">
                    <div className="flex items-center gap-2 truncate max-w-[220px]">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{item.document_name}</span>
                    </div>
                  </td>

                  <td className="py-4 px-5 text-slate-500 whitespace-nowrap font-medium">
                    {new Date(item.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  <td className="py-4 px-5 text-blue-700 font-extrabold">
                    {item.citations.length} Citations
                  </td>

                  <td className="py-4 px-5">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="py-4 px-5 text-right">
                    <span className="text-xs text-blue-700 group-hover:underline font-bold flex items-center justify-end gap-1">
                      <span>Inspect</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Complete Previous Analysis Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="space-y-1.5">
                <span className="text-[11px] text-blue-700 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-blue-600" />
                  Historical Query Grounding Audit Record
                </span>
                <h3 className="font-bold text-base text-slate-900 leading-snug">
                  {selectedRecord.question}
                </h3>
                <div className="text-xs text-slate-500 font-medium">
                  Document: {selectedRecord.document_name} · {new Date(selectedRecord.timestamp).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1">
              {/* Grounded Answer */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-900 font-bold uppercase tracking-wider">Grounded Architectural Synthesis:</span>
                  <span className="text-emerald-800 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Confidence: {(selectedRecord.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed font-normal">
                  {selectedRecord.answer}
                </p>
              </div>

              {/* Exact Page Citations */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Verified Page Sources ({selectedRecord.citations.length})
                </div>
                {selectedRecord.citations.map((c, idx) => (
                  <SourceCitation key={idx} citation={c} index={idx} />
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
