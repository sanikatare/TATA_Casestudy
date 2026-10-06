import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { DocumentItem } from '../types/autosar';
import { StatusBadge } from './StatusBadge';

interface UploadZoneProps {
  onUploadSuccess: (newDoc: DocumentItem) => void;
  onUploadFile: (file: File) => Promise<DocumentItem>;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onUploadSuccess, onUploadFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recentUpload, setRecentUpload] = useState<DocumentItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMsg('Only AUTOSAR High-Level Design PDF documents (.pdf) are supported.');
      return;
    }
    setErrorMsg(null);
    setIsUploading(true);

    try {
      const doc = await onUploadFile(file);
      setRecentUpload(doc);
      onUploadSuccess(doc);
    } catch (e: any) {
      setErrorMsg(e.message || 'PDF ingestion failed. Ensure valid document format.');
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-600 bg-blue-50/70'
            : 'border-slate-300 hover:border-blue-500 bg-white shadow-xs hover:shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center shadow-md">
            {isUploading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Ingest AUTOSAR High-Level Design Specification
            </h3>
            <p className="text-xs text-slate-500">
              Drag and drop PDF here, or <span className="text-blue-700 font-bold underline underline-offset-4">Browse Files</span>
            </p>
          </div>

          <div className="text-xs text-slate-400 max-w-md font-medium">
            Supported: ECU Software Architecture, BSW Matrix, Interface Specs, ARXML Mappings (PDF up to 50MB)
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Post-Upload Summary Cards */}
      {recentUpload && (
        <div className="p-6 rounded-2xl bg-white border border-blue-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900">{recentUpload.filename}</span>
                <div className="text-xs text-slate-500">{recentUpload.ecu_domain}</div>
              </div>
            </div>
            <StatusBadge status={recentUpload.processing_status} label="Ingested & Chunks Indexed" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">FILE SIZE</span>
              <div className="text-slate-800 font-bold mt-1">
                {(recentUpload.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">PAGE COUNT</span>
              <div className="text-slate-800 font-bold mt-1">
                {recentUpload.page_count} Pages Extracted
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">SEMANTIC CHUNKS</span>
              <div className="text-blue-700 font-bold mt-1">
                {recentUpload.chunk_count} Vector Chunks
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">VECTOR STATUS</span>
              <div className="text-emerald-700 font-bold mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Indexed in ChromaDB
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
