import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-100/90">
        <div>
          <h2 className="text-xl font-bold text-blue-950 tracking-tight">
            Query History
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Audit log of architectural inquiries, retrieved chunks, and citations.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-blue-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search queries..."
            className="w-full bg-white border border-blue-200 rounded-lg pl-9 pr-3 py-2 text-xs text-blue-950 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 font-medium transition-all"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-blue-50/60 text-blue-950 border-b border-blue-100 font-bold">
            <tr>
              <th className="py-3 px-4">Query</th>
              <th className="py-3 px-4">Specification</th>
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">Citations</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-50/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-slate-500 font-medium">
                  No query records match your search.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedRecord(item)}
                  className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 max-w-sm">
                    <div className="font-semibold text-blue-950 group-hover:text-blue-600 transition-colors truncate">
                      {item.question}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-[180px] truncate">
                    {item.document_name}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                    {new Date(item.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-4 text-blue-700 font-semibold">
                    {item.citations.length} sources
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-blue-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[85vh] flex flex-col animate-in fade-in duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-blue-50 shrink-0">
              <div>
                <h3 className="font-bold text-sm text-blue-950">
                  Query Details
                </h3>
                <div className="text-[11px] text-blue-600/70 font-mono mt-0.5">
                  {selectedRecord.id} · {new Date(selectedRecord.timestamp).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 text-xs pr-1 flex-1">
              <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Question</span>
                <p className="text-blue-950 font-semibold">{selectedRecord.question}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-1">
                <span className="text-[10px] font-bold text-blue-600 uppercase">Answer</span>
                <p className="text-slate-800 leading-relaxed whitespace-pre-line">{selectedRecord.answer}</p>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-blue-950">
                  Citations ({selectedRecord.citations.length})
                </span>
                <div className="space-y-2">
                  {selectedRecord.citations.map((c, i) => (
                    <SourceCitation key={i} citation={c} index={i} />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-blue-50 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
