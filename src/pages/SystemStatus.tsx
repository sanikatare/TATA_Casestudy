import React, { useEffect, useState } from 'react';
import { RefreshCw, HardDrive, Database, Server, Activity } from 'lucide-react';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await getSystemStatus();
      setComponents(res.components);
      setStats(res.stats);
      setErrorMsg(null);
    } catch (e) {
      console.error('System status query failed', e);
      setErrorMsg(e instanceof Error ? e.message : 'Unable to load system status.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-100/90">
        <div>
          <h2 className="text-xl font-bold text-blue-950 tracking-tight">
            System Diagnostics
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-normal">
            Status of parsing services, vector index, and runtime APIs.
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={isRefreshing}
          className="px-3.5 py-2 bg-white hover:bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-900 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 self-start sm:self-auto shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : 'text-blue-400'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* KPI Cards - Blue & White */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="API Service"
          value="Operational"
          subtext="FastAPI & Node server"
          icon={Server}
          accentColor="blue"
        />

        <MetricCard
          label="Vector Chunks"
          value={stats.totalChunks}
          subtext="Indexed chunks"
          icon={Database}
          accentColor="sky"
        />

        <MetricCard
          label="Documents"
          value={stats.documentsCount}
          subtext="SQLite synchronized"
          icon={HardDrive}
          accentColor="navy"
        />

        <MetricCard
          label="Uptime"
          value={stats.uptime}
          subtext="Runtime uptime"
          icon={Activity}
          accentColor="indigo"
        />
      </div>

      {/* Detailed Components */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-blue-950 tracking-tight">
          Service Components ({components.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((comp) => (
            <SystemStatusCard key={comp.name} component={comp} />
          ))}
        </div>
      </div>
    </div>
  );
};
