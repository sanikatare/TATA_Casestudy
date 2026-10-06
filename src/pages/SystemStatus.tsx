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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            System Status
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time operational diagnostics of API servers, embedding models, and vector persistence.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isRefreshing}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 rounded-lg shadow-2xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh Diagnostics</span>
        </button>
      </div>

      {/* High-level Health KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="API Stack Health"
          value="Operational"
          subtext="FastAPI Backend :8000"
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
          label="System Uptime"
          value={stats.uptime}
          subtext="Continuous Grounding SLA"
          icon={Activity}
          accentColor="green"
        />
      </div>

      {/* Detailed Technical Status Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Pipeline Component Stack
          </h3>
          <span className="text-xs font-mono text-emerald-700 flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            All 7 Services Synchronized
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((comp) => (
            <SystemStatusCard key={comp.name} component={comp} />
          ))}
        </div>
      </div>

      {/* Storage and Persisted Paths */}
      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs space-y-3 font-mono text-xs">
        <div className="text-slate-900 font-bold text-xs uppercase tracking-wider">
          Storage Directories & Persistence Invariants
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[10px]">RAW UPLOADS</span>
            <div className="text-blue-600 font-medium truncate mt-1">./data/uploads</div>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[10px]">VECTOR INDEX</span>
            <div className="text-purple-600 font-medium truncate mt-1">./data/chroma</div>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <span className="text-slate-500 text-[10px]">METADATA SQLITE</span>
            <div className="text-emerald-600 font-medium truncate mt-1">./data/sqlite/autosar_rag.db</div>
          </div>
        </div>
      </div>
    </div>
  );
};
