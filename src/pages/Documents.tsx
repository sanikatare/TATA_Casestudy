import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, X, HardDrive, Bot, Layers, Sliders } from 'lucide-react';
import { UploadZone } from '../components/UploadZone';
import { DocumentTable } from '../components/DocumentTable';
import { StatusBadge } from '../components/StatusBadge';
import { ChunkInspectorModal } from '../components/ChunkInspectorModal';
import { getDocuments, uploadDocument, deleteDocument } from '../services/api';
import { DocumentItem } from '../types/autosar';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [chunkModalDoc, setChunkModalDoc] = useState<DocumentItem | null>(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Document Repository & Ingestion Hub
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage AUTOSAR HLD engineering specifications and monitor semantic chunk extraction.
          </p>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200/90 shadow-2xs font-bold">
          <HardDrive className="w-4 h-4 text-blue-600" />
          <span>Vector Index: <span className="text-slate-900">./data/chroma</span></span>
        </div>
      </div>

      {/* Large Upload Area */}
      <UploadZone
        onUploadSuccess={handleUploadSuccess}
        onUploadFile={uploadDocument}
      />

      {/* Ingested Documents Inventory Table */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Ingested Document Specifications ({documents.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active engineering specifications with page boundaries preserved for verified citations.
            </p>
          </div>
        </div>

        <DocumentTable
          documents={documents}
          onViewDoc={handleView}
          onAnalyzeDoc={handleAnalyze}
          onDeleteDoc={handleDelete}
          onInspectChunks={(doc) => setChunkModalDoc(doc)}
        />
      </div>

      {/* Document Details Modal */}
      {showDetailModal && selectedDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-slate-900 text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 truncate max-w-[280px]">
                    {selectedDoc.filename}
                  </h3>
                  <div className="text-xs text-slate-500 mt-0.5">
                    ID: {selectedDoc.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase">VERSION</span>
                  <div className="text-slate-900 font-extrabold text-sm mt-0.5">{selectedDoc.version}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase">STATUS</span>
                  <div className="mt-0.5"><StatusBadge status={selectedDoc.processing_status} /></div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase">PAGES EXTRACTED</span>
                  <div className="text-slate-900 font-extrabold text-sm mt-0.5">{selectedDoc.page_count} Pages</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase">SEMANTIC CHUNKS</span>
                  <div className="text-blue-700 font-extrabold text-sm mt-0.5">{selectedDoc.chunk_count} Chunks</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-slate-500 text-[10px] font-bold uppercase">ARCHITECTURAL DOMAIN</span>
                <div className="text-slate-900 font-bold text-sm">{selectedDoc.ecu_domain || 'Automotive Central Gateway'}</div>
                <div className="text-slate-600 text-xs">Standard: {selectedDoc.standard || 'AUTOSAR Classic 4.4'}</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  const target = selectedDoc;
                  setShowDetailModal(false);
                  setChunkModalDoc(target);
                }}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Inspect Chunks & Debug</span>
              </button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleAnalyze(selectedDoc);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
                >
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span>Launch in Assistant</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chunk Inspector & RAG Debug Studio Modal */}
      {chunkModalDoc && (
        <ChunkInspectorModal
          document={chunkModalDoc}
          onClose={() => setChunkModalDoc(null)}
        />
      )}
    </div>
  );
};
