import React from 'react';
import { FileText, Eye, Bot, Trash2 } from 'lucide-react';
import { DocumentItem } from '../types/autosar';
import { StatusBadge } from './StatusBadge';

interface DocumentTableProps {
  documents: DocumentItem[];
  onViewDoc: (doc: DocumentItem) => void;
  onAnalyzeDoc: (doc: DocumentItem) => void;
  onDeleteDoc: (docId: string) => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  onViewDoc,
  onAnalyzeDoc,
  onDeleteDoc
}) => {
  if (documents.length === 0) {
    return (
      <div className="p-12 text-center rounded-xl bg-white border border-slate-200 text-slate-500 shadow-xs">
        <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">No AUTOSAR HLD documents uploaded yet</p>
        <p className="text-xs text-slate-500 mt-1">Upload a PDF specification above to begin parsing and vector indexing.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200 uppercase tracking-wider text-[11px]">
          <tr>
            <th className="py-3 px-4">Document</th>
            <th className="py-3 px-4">Version</th>
            <th className="py-3 px-4">Pages</th>
            <th className="py-3 px-4">Uploaded</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-blue-50 text-blue-600 border border-blue-200">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 tracking-tight">{doc.filename}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {doc.ecu_domain || 'ECU Specification'} · {(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                </div>
              </td>

              <td className="py-3.5 px-4 font-mono text-slate-700">
                {doc.version || 'v1.0'}
              </td>

              <td className="py-3.5 px-4 font-mono text-slate-700">
                {doc.page_count}
              </td>

              <td className="py-3.5 px-4 font-mono text-slate-500">
                {new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </td>

              <td className="py-3.5 px-4">
                <StatusBadge status={doc.processing_status} />
              </td>

              <td className="py-3.5 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onViewDoc(doc)}
                    title="View Document Details"
                    className="p-1.5 rounded hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onAnalyzeDoc(doc)}
                    title="Analyze in HLD Assistant"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Bot className="w-3 h-3" />
                    <span>Analyze</span>
                  </button>

                  <button
                    onClick={() => onDeleteDoc(doc.id)}
                    title="Delete Document"
                    className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
