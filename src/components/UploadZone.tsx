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
    <div className="space-y-4">
      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50/60'
            : 'border-slate-300 hover:border-blue-400 bg-white shadow-xs'
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

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Upload AUTOSAR HLD
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Drag and drop PDF here, or <span className="text-blue-600 font-semibold underline underline-offset-2">Browse Files</span>
            </p>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Supported: ECU Software Architecture, BSW Matrix, Interface Specs (PDF up to 50MB)
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Post-Upload Summary Cards */}
      {recentUpload && (
        <div className="p-4 rounded-xl bg-white border border-blue-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-slate-900 font-mono">{recentUpload.filename}</span>
            </div>
            <StatusBadge status={recentUpload.processing_status} label="Indexed" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs font-mono">
            <div>
              <span className="text-slate-400 text-[10px]">FILE SIZE</span>
              <div className="text-slate-800 font-semibold mt-0.5">
                {(recentUpload.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px]">TOTAL PAGES</span>
              <div className="text-slate-800 font-semibold mt-0.5">
                {recentUpload.page_count} Pages
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px]">CHUNKS GENERATED</span>
              <div className="text-blue-600 font-semibold mt-0.5">
                {recentUpload.chunk_count} Chunks
              </div>
            </div>

            <div>
              <span className="text-slate-400 text-[10px]">INDEX STATUS</span>
              <div className="text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready in ChromaDB
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
