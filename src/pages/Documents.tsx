import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, X, HardDrive } from 'lucide-react';
import { UploadZone } from '../components/UploadZone';
import { DocumentTable } from '../components/DocumentTable';
import { StatusBadge } from '../components/StatusBadge';
import { getDocuments, uploadDocument, deleteDocument } from '../services/api';
import { DocumentItem } from '../types/autosar';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadDocs() {
      try {
        const list = await getDocuments();
        setDocuments(list);
      } catch (e) {
        console.error('Document load error', e);
      } finally {
        setLoading(false);
      }
    }
    loadDocs();
  }, []);

  const handleUploadSuccess = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev.filter(d => d.id !== newDoc.id)]);
  };

  const handleDelete = async (docId: string) => {
    if (confirm('Are you sure you want to remove this AUTOSAR HLD specification and delete its ChromaDB vector index?')) {
      await deleteDocument(docId);
      setDocuments((prev) => prev.filter(d => d.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
        setShowDetailModal(false);
      }
    }
  };

  const handleView = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setShowDetailModal(true);
  };

  const handleAnalyze = (doc: DocumentItem) => {
    navigate('/assistant', { state: { targetDocId: doc.id } });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Documents
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage AUTOSAR HLD engineering documents and monitor vector chunk extraction.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
          <HardDrive className="w-4 h-4 text-blue-600" />
          <span>Local Storage: <code>./data/uploads</code></span>
        </div>
      </div>

      {/* Large Upload Area */}
      <UploadZone
        onUploadSuccess={handleUploadSuccess}
        onUploadFile={uploadDocument}
      />

      {/* Ingested Documents Inventory Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Ingested Document Repository ({documents.length})
            </h3>
            <p className="text-xs text-slate-500">
              Active specifications with page boundaries preserved for source citations.
            </p>
          </div>
        </div>

        <DocumentTable
          documents={documents}
          onViewDoc={handleView}
          onAnalyzeDoc={handleAnalyze}
          onDeleteDoc={handleDelete}
        />
      </div>

      {/* Document Inspector Modal */}
      {showDetailModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 truncate max-w-[280px]">
                    {selectedDoc.filename}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    ID: {selectedDoc.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px]">VERSION</span>
                  <div className="text-slate-900 font-bold">{selectedDoc.version}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">STATUS</span>
                  <div><StatusBadge status={selectedDoc.processing_status} /></div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">PAGES</span>
                  <div className="text-slate-900 font-bold">{selectedDoc.page_count} Pages</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px]">SEMANTIC CHUNKS</span>
                  <div className="text-blue-600 font-bold">{selectedDoc.chunk_count} Chunks</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="text-slate-500 text-[10px]">ARCHITECTURAL DOMAIN</span>
                <div className="text-slate-800 font-sans">{selectedDoc.ecu_domain || 'Automotive Central Gateway'}</div>
                <div className="text-slate-500 font-sans text-[11px]">Standard: {selectedDoc.standard || 'AUTOSAR Classic 4.4'}</div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleAnalyze(selectedDoc);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Launch in HLD Assistant</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
