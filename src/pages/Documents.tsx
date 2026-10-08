import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, X, Filter, AlertCircle } from 'lucide-react';
import { UploadZone } from '../components/UploadZone';
import { DocumentTable } from '../components/DocumentTable';
import { StatusBadge } from '../components/StatusBadge';
import { ChunkInspectorModal } from '../components/ChunkInspectorModal';
import { getDocuments, uploadDocument, deleteDocument } from '../services/api';
import { DocumentItem } from '../types/autosar';
import { useDomain, ECU_DOMAINS } from '../context/DomainContext';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedDomain, domainLabel, setSelectedDomain } = useDomain();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [chunkModalDoc, setChunkModalDoc] = useState<DocumentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDocs() {
      setBackendError(null);
      try {
        const list = await getDocuments();
        setDocuments(list);
      } catch (e: any) {
        console.error('Document load error', e);
        setBackendError(e?.message || 'Cannot connect to FastAPI backend');
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
    if (confirm('Are you sure you want to remove this specification and its vector index?')) {
      try {
        await deleteDocument(docId);
        setDocuments((prev) => prev.filter(d => d.id !== docId));
        if (selectedDoc?.id === docId) {
          setSelectedDoc(null);
          setShowDetailModal(false);
        }
      } catch (e: any) {
        setBackendError(e?.message || 'Failed to delete document');
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

  const domainDef = ECU_DOMAINS.find(d => d.id === selectedDomain);
  const filteredDocs = selectedDomain === 'ALL'
    ? documents
    : documents.filter(d => {
        if (!domainDef?.match) return true;
        const matchStr = domainDef.match.toLowerCase();
        return (d.ecu_domain || '').toLowerCase().includes(matchStr) ||
               (d.filename || '').toLowerCase().includes(matchStr);
      });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-blue-100/90 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-blue-950 tracking-tight">
            Document Repository
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Upload and manage AUTOSAR HLD specifications for semantic indexing.
          </p>
        </div>

        {selectedDomain !== 'ALL' && (
          <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 font-semibold shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Domain Scope: <strong>{domainLabel}</strong></span>
            <button
              onClick={() => setSelectedDomain('ALL')}
              className="text-xs text-blue-600 hover:text-blue-900 underline font-bold ml-1 cursor-pointer"
            >
              Show All
            </button>
          </div>
        )}
      </div>

      {/* Backend Connection Error Banner */}
      {backendError && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#1e40af] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#1e40af] shrink-0" />
            <div>
              <span className="font-bold">FastAPI Connection Alert:</span> {backendError}
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-[#1e40af] text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Upload Area */}
      <UploadZone
        onUploadSuccess={handleUploadSuccess}
        onUploadFile={uploadDocument}
      />

      {/* Documents Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-blue-950 tracking-tight">
            Specifications ({filteredDocs.length}{filteredDocs.length !== documents.length ? ` of ${documents.length}` : ''})
          </h3>
        </div>

        <DocumentTable
          documents={filteredDocs}
          onViewDoc={handleView}
          onAnalyzeDoc={handleAnalyze}
          onDeleteDoc={handleDelete}
          onInspectChunks={(doc) => setChunkModalDoc(doc)}
        />
      </div>

      {/* Document Details Modal */}
      {showDetailModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-blue-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-blue-100 shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-blue-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-xs shadow-blue-500/20">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-blue-950 truncate max-w-[240px]">
                    {selectedDoc.filename}
                  </h3>
                  <div className="text-[11px] text-blue-500 font-mono mt-0.5">
                    {selectedDoc.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-blue-700 p-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <div>
                  <span className="text-slate-400 text-[10px] font-semibold uppercase">Standard</span>
                  <div className="text-blue-950 font-bold mt-0.5">{selectedDoc.standard || 'Classic 4.4'}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-semibold uppercase">Status</span>
                  <div className="mt-0.5"><StatusBadge status={selectedDoc.processing_status} /></div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-semibold uppercase">Pages</span>
                  <div className="text-blue-950 font-bold mt-0.5">{selectedDoc.page_count} Pages</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-semibold uppercase">Chunks</span>
                  <div className="text-blue-600 font-bold mt-0.5">{selectedDoc.chunk_count} Chunks</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-blue-50">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleAnalyze(selectedDoc);
                }}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-colors cursor-pointer"
              >
                Query in Assistant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chunk Inspector Modal */}
      {chunkModalDoc && (
        <ChunkInspectorModal
          document={chunkModalDoc}
          onClose={() => setChunkModalDoc(null)}
        />
      )}
    </div>
  );
};
