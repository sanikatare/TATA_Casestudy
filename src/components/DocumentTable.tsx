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
      <div className="p-12 text-center rounded-xl bg-white border border-slate-200/90 text-slate-500 space-y-2">
        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-slate-900">No documents uploaded</p>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Upload an AUTOSAR specification PDF above to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-blue-100 bg-white shadow-2xs">
      <table className="w-full text-left text-xs">
        <thead className="bg-blue-50/60 text-blue-950 border-b border-blue-100 font-semibold">
          <tr>
            <th className="py-3 px-4">Specification</th>
            <th className="py-3 px-4">Version</th>
            <th className="py-3 px-4">Pages</th>
            <th className="py-3 px-4">Uploaded</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50/60">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-blue-50/30 transition-colors">
              <td className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-blue-950 text-xs">{doc.filename}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {doc.ecu_domain || 'ECU'} · {(doc.file_size_bytes / (1024 * 1024)).toFixed(1)} MB
                    </div>
                  </div>
                </div>
              </td>

              <td className="py-3 px-4 text-slate-700 font-medium">
                {doc.version || 'v1.0'}
              </td>

              <td className="py-3 px-4 text-blue-950 font-semibold">
                {doc.page_count}
              </td>

              <td className="py-3 px-4 text-slate-500 text-[11px]">
                {doc.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  : '-'}
              </td>

              <td className="py-3 px-4">
                <StatusBadge status={doc.processing_status} />
              </td>

              <td className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onViewDoc(doc)}
                    title="View details"
                    className="p-1.5 rounded-md hover:bg-blue-50 text-slate-500 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {onInspectChunks && (
                    <button
                      onClick={() => onInspectChunks(doc)}
                      title="Inspect chunks"
                      className="px-2.5 py-1 rounded-md text-xs font-semibold text-blue-800 hover:bg-blue-50 border border-blue-200 transition-colors cursor-pointer"
                    >
                      Chunks
                    </button>
                  )}

                  <button
                    onClick={() => onAnalyzeDoc(doc)}
                    title="Query in assistant"
                    className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs shadow-blue-500/20"
                  >
                    Query
                  </button>

                  <button
                    onClick={() => onDeleteDoc(doc.id)}
                    title="Delete document"
                    className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-900 transition-colors cursor-pointer"
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
