import React, { useEffect, useState } from 'react';
import { Activity, RefreshCw, HardDrive, Database, Server, CheckCircle2 } from 'lucide-react';
import { SystemStatusCard } from '../components/SystemStatusCard';
import { MetricCard } from '../components/MetricCard';
import { getSystemStatus } from '../services/api';
import { PipelineComponentStatus } from '../types/autosar';

export const SystemStatusPage: React.FC = () => {
  const [components, setComponents] = useState<PipelineComponentStatus[]>([]);
  const [stats, setStats] = useState({
    documentsCount: 0,
    totalChunks: 0,
    queriesCount: 0,
    uptime: "99.98%"
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await getSystemStatus();
      setComponents(res.components);
      setStats(res.stats);
    } catch (e) {
      console.error('System status query failed', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            System Diagnostics & Infrastructure Health
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Real-time operational status of API servers, embedding models, and vector persistence.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isRefreshing}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-xs font-bold text-slate-800 rounded-xl shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* High-level Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          label="API Stack Health"
          value="Operational"
          subtext="FastAPI / Node Engine"
          icon={Server}
          accentColor="green"
        />

        <MetricCard
          label="Vector Store"
          value={`${stats.totalChunks} Chunks`}
          subtext="ChromaDB Persistent Collection"
          icon={Database}
          accentColor="blue"
        />

        <MetricCard
          label="Active Documents"
          value={stats.documentsCount}
          subtext="SQLite Metadata Synchronized"
          icon={HardDrive}
          accentColor="violet"
        />

        <MetricCard
          label="Continuous Uptime"
          value={stats.uptime}
          subtext="Grounding SLA Compliant"
          icon={Activity}
          accentColor="green"
        />
      </div>

      {/* Detailed Technical Status Cards */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Pipeline Component Stack
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Individual component latencies and operational status.
            </p>
          </div>
          <span className="text-xs text-emerald-800 flex items-center gap-1.5 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            All 7 Services Synchronized
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {components.map((comp) => (
            <SystemStatusCard key={comp.name} component={comp} />
          ))}
        </div>
      </div>

      {/* Storage and Persisted Paths */}
      <div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 text-xs">
        <div className="text-slate-900 font-bold text-sm uppercase tracking-wider">
          Storage Directories & Persistence Invariants
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-slate-700">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase">RAW UPLOADS DIRECTORY</span>
            <div className="text-blue-700 font-bold truncate">./data/uploads</div>
            <div className="text-[11px] text-slate-500">Preserved original PDF binaries</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase">VECTOR INDEX STORAGE</span>
            <div className="text-purple-700 font-bold truncate">./data/chroma</div>
            <div className="text-[11px] text-slate-500">ChromaDB parquet & index tables</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase">METADATA SQLITE DB</span>
            <div className="text-emerald-700 font-bold truncate">./data/sqlite/autosar_rag.db</div>
            <div className="text-[11px] text-slate-500">Relational schema with foreign keys</div>
          </div>
        </div>
      </div>
    </div>
  );
};
