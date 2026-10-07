import React, { useState } from 'react';
import { Database, Cpu, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [topK, setTopK] = useState(5);
  const [chunkSize, setChunkSize] = useState(512);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="pb-4 border-b border-blue-100/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-blue-950 tracking-tight">
            Configuration
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Model parameters, chunking sizes, and retrieval depth.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-xs shadow-blue-500/20"
        >
          {savedNotice ? <Check className="w-3.5 h-3.5 text-white" /> : null}
          <span>{savedNotice ? 'Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Model & Retrieval */}
      <div className="p-6 rounded-xl bg-white border border-blue-100/90 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-blue-50">
          <Cpu className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-blue-950">
            Model & Retrieval Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase">Embedding Model</span>
            <div className="text-blue-950 font-bold">BAAI/bge-small-en-v1.5</div>
            <div className="text-slate-500 text-[11px]">384 dimensions · Normalized space</div>
          </div>

          <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase">Inference Engine</span>
            <div className="text-blue-950 font-bold">Deterministic Grounded Synthesizer</div>
            <div className="text-slate-500 text-[11px]">Negative constraint enforcement</div>
          </div>

          <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-semibold uppercase">Chunk Token Size</span>
              <span className="text-blue-600 font-bold">{chunkSize} tokens</span>
            </div>
            <input
              type="range"
              min="256"
              max="1024"
              step="128"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-semibold uppercase">Top-K Retrieval</span>
              <span className="text-blue-600 font-bold">k = {topK}</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Persistence */}
      <div className="p-6 rounded-xl bg-white border border-blue-100/90 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-blue-50">
          <Database className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-blue-950">
            Storage & Persistence
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase">Vector Store</span>
            <div className="text-blue-950 font-bold">ChromaDB / In-Memory Fallback</div>
            <div className="text-slate-500 text-[11px]">./data/chroma</div>
          </div>

          <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-1">
            <span className="text-[10px] font-bold text-blue-600 uppercase">Metadata Store</span>
            <div className="text-blue-950 font-bold">SQLite 3</div>
            <div className="text-slate-500 text-[11px]">./data/sqlite/autosar_hld.db</div>
          </div>
        </div>
      </div>
    </div>
  );
};
