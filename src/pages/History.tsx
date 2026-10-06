import React, { useState, useEffect } from 'react';
import { FileText, ChevronRight, X, Search } from 'lucide-react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Query History
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit trail of architectural queries, retrieved vector chunks, and grounded responses.
          </p>
        </div>

        {/* Search filter input */}
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search queries or documents..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 shadow-2xs"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3 px-4">Question</th>
              <th className="py-3 px-4">Document</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Sources</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No historical queries match your search filter.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedRecord(item)}
                  className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  <td className="py-3.5 px-4 max-w-md">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {item.question}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-700">
                    <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{item.document_name}</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-blue-600 font-semibold">
                    {item.citations.length} Citations
                  </td>

                  <td className="py-3.5 px-4">
                    <StatusBadge status={item.status} />
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <span className="text-xs text-blue-600 group-hover:underline font-semibold flex items-center justify-end gap-1">
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="space-y-1">
                <span className="text-[11px] font-mono text-blue-600 uppercase tracking-wider font-bold">
                  Historical Query Analysis Detail
                </span>
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedRecord.question}
                </h3>
                <div className="text-[11px] text-slate-500 font-mono">
                  Target: {selectedRecord.document_name} · {new Date(selectedRecord.timestamp).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Grounded Answer */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-500">
                  <span className="text-purple-700 font-bold">Grounded Answer Synthesis:</span>
                  <span className="text-emerald-700 font-semibold">
                    Confidence: {(selectedRecord.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-sans">
                  {selectedRecord.answer}
                </p>
              </div>

              {/* Exact Page Citations */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
                  Verified Page Sources ({selectedRecord.citations.length})
                </div>
                {selectedRecord.citations.map((c, idx) => (
                  <SourceCitation key={idx} citation={c} index={idx} />
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold transition-colors cursor-pointer"
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
