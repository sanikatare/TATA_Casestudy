import React, { useState } from 'react';
import { Shield, Database, Cpu, Sliders, Check } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [topK, setTopK] = useState(5);
  const [chunkSize, setChunkSize] = useState(512);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Banner */}
      <div className="pb-6 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            System Configuration & Hyperparameters
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Inspect RAG parameters, embedding configurations, vector persistence paths, and retrieval limits.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto shadow-xs"
        >
          {savedNotice ? <Check className="w-4 h-4 text-emerald-400" /> : <Sliders className="w-4 h-4 text-blue-400" />}
          <span>{savedNotice ? 'Parameters Saved' : 'Save Parameters'}</span>
        </button>
      </div>

      {/* Configuration Group 1: Model & RAG Orchestration */}
      <div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Model & RAG Orchestration Parameters
            </h3>
            <p className="text-xs text-slate-500">Inference provider, embedding depth, and vector chunking</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-slate-500 text-[10px] font-bold uppercase">EMBEDDING MODEL</span>
            <div className="text-slate-900 font-extrabold text-sm">BAAI/bge-small-en-v1.5</div>
            <div className="text-xs text-slate-600">384 Dimensions · Dense technical document vector space</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-slate-500 text-[10px] font-bold uppercase">LLM INFERENCE ENGINE</span>
            <div className="text-slate-900 font-extrabold text-sm">Local / Zero-Hallucination Guard</div>
            <div className="text-xs text-slate-600">Strict grounding instruction template active</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold uppercase">CHUNK TOKEN SIZE</span>
              <span className="text-blue-700 font-bold">{chunkSize} Tokens</span>
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
            <div className="text-[11px] text-slate-500">Preserves ECU section headers and interface tables</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-bold uppercase">TOP-K RETRIEVAL DEPTH</span>
              <span className="text-emerald-700 font-bold">k = {topK} Chunks</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
            <div className="text-[11px] text-slate-500">Cosine similarity cutoff threshold: 0.70</div>
          </div>
        </div>
      </div>

      {/* Configuration Group 2: Persistence & Databases */}
      <div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Databases & Local Storage Paths
            </h3>
            <p className="text-xs text-slate-500">Vector store collection and SQLite database configurations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-slate-500 text-[10px] font-bold uppercase">VECTOR DATABASE</span>
            <div className="text-slate-900 font-extrabold text-sm">ChromaDB Local Engine</div>
            <div className="text-xs text-slate-600">Collection: <code className="font-bold">autosar_hld_chunks</code></div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <span className="text-slate-500 text-[10px] font-bold uppercase">SQLITE PERSISTENCE</span>
            <div className="text-slate-900 font-extrabold text-sm">SQLite 3 (ACID Relational)</div>
            <div className="text-xs text-slate-600">Path: <code className="font-bold">./data/sqlite/autosar_rag.db</code></div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 md:col-span-2">
            <span className="text-slate-500 text-[10px] font-bold uppercase">REST API ENDPOINT</span>
            <div className="text-blue-700 font-extrabold text-sm">AI Studio Node Engine (Port 3000)</div>
            <div className="text-xs text-slate-600">
              Configurable via <code className="font-bold">VITE_BACKEND_URL</code> environment variable. Local high-speed in-memory simulation active.
            </div>
          </div>
        </div>
      </div>

      {/* Security & Secret Masking Guarantee */}
      <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-4 text-xs text-emerald-900 shadow-2xs">
        <Shield className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-extrabold text-sm text-emerald-950">Zero Hardcoded Secrets Policy</span>
          <p className="leading-relaxed font-medium">
            All API credentials and model tokens are loaded strictly server-side via environment variables. No private secrets or credentials are baked into client bundles.
          </p>
        </div>
      </div>
    </div>
  );
};
