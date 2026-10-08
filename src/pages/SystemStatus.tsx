import React, { useEffect, useState } from 'react';
import { RefreshCw, HardDrive, Database, Server, Activity, AlertCircle } from 'lucide-react';
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
  const [backendError, setBackendError] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    setBackendError(null);
    try {
      const res = await getSystemStatus();
      setComponents(res.components);
      setStats(res.stats);
      if (res.stats.uptime.includes('Unavailable')) {
        setBackendError('FastAPI backend is currently unavailable. Ensure uvicorn is running.');
      }
    } catch (e: any) {
      console.error('System status query failed', e);
      setBackendError(e?.message || 'Cannot connect to FastAPI backend');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="space-y-6">
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
            onClick={fetchStatus}
            className="px-3 py-1.5 bg-[#1e40af] text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors shrink-0 cursor-pointer"
          >
            Retry Diagnostics
          </button>
        </div>
      )}

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
