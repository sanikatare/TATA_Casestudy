import React from 'react';
import { Shield, Database, Cpu } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Banner */}
      <div className="pb-6 border-b border-slate-200">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          System Configuration & Settings
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Inspect RAG parameters, embedding configurations, vector persistence paths, and FastAPI endpoints.
        </p>
      </div>

      {/* Configuration Group 1: Model & RAG Orchestration */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Cpu className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Model & RAG Orchestration Parameters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 text-[10px]">EMBEDDING MODEL</span>
            <div className="text-slate-900 font-bold">BAAI/bge-small-en-v1.5</div>
            <div className="text-[11px] text-slate-600 font-sans">384 Dimensions · Optimized for dense technical documents</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 text-[10px]">LLM INFERENCE PROVIDER</span>
            <div className="text-slate-900 font-bold">Local Model / Configured LLM</div>
            <div className="text-[11px] text-slate-600 font-sans">Zero-hallucination instruction prompt template active</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 text-[10px]">CHUNK SIZE & OVERLAP</span>
            <div className="text-blue-600 font-bold">512 Tokens / 15% Overlap</div>
            <div className="text-[11px] text-slate-600 font-sans">Preserves ECU section headers and interface tables</div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 text-[10px]">TOP-K RETRIEVAL DEPTH</span>
            <div className="text-emerald-600 font-bold">k = 5 Chunks</div>
            <div className="text-[11px] text-slate-600 font-sans">Cosine similarity cutoff threshold: 0.70</div>
          </div>
        </div>
      </div>

      {/* Configuration Group 2: Persistence & Databases */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Database className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Databases & Local Storage Paths
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 text-[10px]">VECTOR DATABASE</span>
            <div className="text-slate-900 font-bold">ChromaDB Local</div>
            <div className="text-[11px] text-slate-600 font-sans">Collection: <code>autosar_hld_chunks</code></div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-500 text-[10px]">SQLITE PERSISTENCE</span>
            <div className="text-slate-900 font-bold">SQLite 3 (ACID Relational)</div>
            <div className="text-[11px] text-slate-600 font-sans">Path: <code>./data/sqlite/autosar_rag.db</code></div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 md:col-span-2">
            <span className="text-slate-500 text-[10px]">FASTAPI REST ENDPOINT</span>
            <div className="text-blue-600 font-bold">http://localhost:8000</div>
            <div className="text-[11px] text-slate-600 font-sans">Configurable via <code>VITE_BACKEND_URL</code> environment variable</div>
          </div>
        </div>
      </div>

      {/* Security & Secret Masking Guarantee */}
      <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-800 font-sans shadow-2xs">
        <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-emerald-900">Zero Hardcoded Secrets Policy</span>
          <p className="mt-0.5 leading-relaxed">
            All API keys and provider tokens are loaded strictly server-side via <code>.env</code> file. No private credentials or authentication secrets are exposed to the client bundle.
          </p>
        </div>
      </div>
    </div>
  );
};
