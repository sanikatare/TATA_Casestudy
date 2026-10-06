import React from 'react';
import { FileText, Eye, Bot, Trash2, Layers } from 'lucide-react';
import { DocumentItem } from '../types/autosar';
import { StatusBadge } from './StatusBadge';

interface DocumentTableProps {
  documents: DocumentItem[];
  onViewDoc: (doc: DocumentItem) => void;
  onAnalyzeDoc: (doc: DocumentItem) => void;
  onDeleteDoc: (docId: string) => void;
  onInspectChunks?: (doc: DocumentItem) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onViewDoc,
  onAnalyzeDoc,
  onDeleteDoc,
  onInspectChunks
}) => {
  if (documents.length === 0) {
    return (
      <div className="p-16 text-center rounded-2xl bg-white border border-slate-200/90 text-slate-500 shadow-xs space-y-3">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <p className="text-base font-bold text-slate-900">No AUTOSAR HLD documents uploaded yet</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Upload an automotive PDF specification above to begin parsing and vector chunk indexing.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50/90 text-slate-700 border-b border-slate-200/90 uppercase tracking-wider text-[11px] font-bold">
          <tr>
            <th className="py-4 px-5">Document Specification</th>
            <th className="py-4 px-5">Release</th>
            <th className="py-4 px-5">Page Count</th>
            <th className="py-4 px-5">Ingested</th>
            <th className="py-4 px-5">Index Status</th>
            <th className="py-4 px-5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-4 px-5">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-900 text-blue-400 shrink-0 shadow-2xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm tracking-tight">{doc.filename}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {doc.ecu_domain || 'ECU Specification'} · {(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                </div>
              </td>

              <td className="py-4 px-5 font-bold text-slate-800">
                {doc.version || 'v1.0'}
              </td>

              <td className="py-4 px-5 font-extrabold text-slate-900">
                {doc.page_count} Pages
              </td>

              <td className="py-4 px-5 text-slate-600 font-medium">
                {new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </td>

              <td className="py-4 px-5">
                <StatusBadge status={doc.processing_status} />
              </td>

              <td className="py-4 px-5 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewDoc(doc)}
                    title="View Document Details"
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {onInspectChunks && (
                    <button
                      onClick={() => onInspectChunks(doc)}
                      title="Inspect Chunks & RAG Debug"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold transition-all cursor-pointer border border-blue-200"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chunks</span>
                    </button>
                  )}

                  <button
                    onClick={() => onAnalyzeDoc(doc)}
                    title="Analyze in HLD Assistant"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Bot className="w-3.5 h-3.5 text-blue-400" />
                    <span>Analyze</span>
                  </button>

                  <button
                    onClick={() => onDeleteDoc(doc.id)}
                    title="Delete Document"
                    className="p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
