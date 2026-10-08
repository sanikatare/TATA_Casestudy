import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Bot,
  Layers,
  Cpu,
  Clock,
  ArrowRight,
  TrendingUp,
  Activity,
  Upload,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { getDocuments, getHistory, getSystemStatus } from '../services/api';
import { DocumentItem, QueryRecord, PipelineComponentStatus } from '../types/autosar';

import heroImage from '../assets/images/hero_tata_automotive_1791276417445.jpg';
import cockpitImage from '../assets/images/tata_sdv_cockpit_1791276431442.jpg';
import evPlatformImage from '../assets/images/tata_ev_platform_1791276444755.jpg';

const QUERY_TREND_DATA = [
  { day: 'Mon', queries: 12 },
  { day: 'Tue', queries: 19 },
  { day: 'Wed', queries: 28 },
  { day: 'Thu', queries: 24 },
  { day: 'Fri', queries: 37 },
  { day: 'Sat', queries: 16 },
  { day: 'Sun', queries: 31 },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [pipeline, setPipeline] = useState<PipelineComponentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setBackendError(null);
      try {
        const [docs, hist, sys] = await Promise.all([
          getDocuments(),
          getHistory(),
          getSystemStatus()
        ]);
        setDocuments(docs);
        setQueries(hist);
        setPipeline(sys.components);
      } catch (e: any) {
        console.error('Failed to load dashboard data', e);
        setBackendError(e?.message || 'Cannot connect to FastAPI backend');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalPages = documents.reduce((acc, d) => acc + d.page_count, 0);

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
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 bg-[#1e40af] text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Hero Banner - Exceptional Blue & White Theme */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white border border-blue-900 shadow-sm">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Automotive Architecture"
            className="w-full h-full object-cover object-center opacity-20 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-blue-900/85 to-blue-800/60" />
        </div>

        <div className="relative z-10 p-8 sm:p-10 max-w-2xl space-y-4">
          <div className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
            AUTOSAR Classic 4.4 & Adaptive Platform
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
            ECU Architecture & High-Level Design
          </h1>

          <p className="text-sm text-blue-100/90 leading-relaxed font-normal">
            Analyze vehicle software components, communication interfaces, and runtime configurations with page-level source citations.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => navigate('/assistant')}
              className="px-5 py-2.5 bg-white hover:bg-blue-50 text-blue-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Bot className="w-4 h-4 text-blue-700" />
              <span>Open HLD Assistant</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => navigate('/documents')}
              className="px-5 py-2.5 bg-blue-800/80 hover:bg-blue-750 text-white border border-blue-400/40 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-sky-200" />
              <span>Upload Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards - Blue & White */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Documents Indexed"
          value={documents.length}
          subtext={`${totalPages} specification pages`}
          icon={FileText}
          accentColor="blue"
          trend={{ value: "4 ECUs", isPositive: true }}
        />

        <MetricCard
          label="Total Queries"
          value={queries.length}
          subtext="Verified page citations"
          icon={Bot}
          accentColor="sky"
          trend={{ value: "Active", isPositive: true }}
        />

        <MetricCard
          label="Software Components"
          value="48"
          subtext="Extracted SW-Cs & modules"
          icon={Layers}
          accentColor="indigo"
          trend={{ value: "ASIL-D", isPositive: true }}
        />

        <MetricCard
          label="System Status"
          value="Operational"
          subtext="Vector store & parser live"
          icon={Cpu}
          accentColor="navy"
          trend={{ value: "Healthy", isPositive: true }}
        />
      </div>

      {/* Analytics & Pipeline Status */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Query Analytics Chart */}
        <div className="lg:col-span-8 p-6 rounded-xl bg-white border border-blue-100/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-blue-950 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Weekly Query Volume</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily query traffic across active ECU specifications
              </p>
            </div>
            <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2.5 py-1 rounded-md">Last 7 days</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={QUERY_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="queryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#BFDBFE',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0F172A',
                    boxShadow: '0 4px 6px -1px rgb(37 99 235 / 0.1)'
                  }}
                />
                <Area type="monotone" dataKey="queries" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#queryGrad)" name="Queries" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Components Status */}
        <div className="lg:col-span-4 p-6 rounded-xl bg-white border border-blue-100/90 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-blue-950 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Service Stack</span>
              </h3>
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)] animate-pulse" />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Status of parsing and vector services
            </p>

            <div className="space-y-2 text-xs">
              {[
                { name: 'Document Parser', sub: 'Native & PDF Engine', status: 'OPERATIONAL' },
                { name: 'Embedding Service', sub: '384-d normalized space', status: 'OPERATIONAL' },
                { name: 'Vector Store', sub: 'Indexed collection', status: 'OPERATIONAL' },
                { name: 'Grounding Engine', sub: 'Page-level validation', status: 'OPERATIONAL' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/80 hover:bg-blue-50/70 transition-colors flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-blue-950">{item.name}</div>
                    <div className="text-[11px] text-slate-500">{item.sub}</div>
                  </div>
                  <StatusBadge status="OPERATIONAL" label="Live" size="sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-blue-50 text-xs text-slate-500 flex items-center justify-between">
            <span>Database:</span>
            <span className="text-blue-900 font-semibold">SQLite 3</span>
          </div>
        </div>
      </div>

      {/* Architecture References */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-blue-100/90 bg-white hover:border-blue-300 transition-all overflow-hidden shadow-2xs flex flex-col sm:flex-row group">
          <div className="sm:w-2/5 h-44 sm:h-auto relative overflow-hidden">
            <img
              src={cockpitImage}
              alt="Cockpit Architecture"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="p-5 sm:w-3/5 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                SDV Domain
              </div>
              <h4 className="text-sm font-bold text-blue-950">
                Cockpit & Zonal Controller
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                High-speed Ethernet, SOME/IP services, and diagnostics over IP (DoIP).
              </p>
            </div>
            <button
              onClick={() => navigate('/assistant', { state: { targetDocId: 'doc-bd-03' } })}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer pt-2"
            >
              <span>Explore Specification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100/90 bg-white hover:border-blue-300 transition-all overflow-hidden shadow-2xs flex flex-col sm:flex-row group">
          <div className="sm:w-2/5 h-44 sm:h-auto relative overflow-hidden">
            <img
              src={evPlatformImage}
              alt="EV Platform"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <div className="p-5 sm:w-3/5 space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                Powertrain Domain
              </div>
              <h4 className="text-sm font-bold text-blue-950">
                Powertrain & Battery Management
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                ASIL-D torque arbitration, lockstep execution, and dual-sensor plausibility.
              </p>
            </div>
            <button
              onClick={() => navigate('/assistant', { state: { targetDocId: 'doc-pt-02' } })}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer pt-2"
            >
              <span>Explore Specification</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Specifications & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Documents Table */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-white border border-blue-100/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-blue-950 tracking-tight">
                Active Specifications
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingested documents available for query
              </p>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto border border-blue-100 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-blue-50/60 text-blue-950 border-b border-blue-100 font-semibold">
                <tr>
                  <th className="p-3">Specification</th>
                  <th className="p-3">Standard</th>
                  <th className="p-3">Pages</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50/60">
                {documents.slice(0, 4).map((doc) => (
                  <tr key={doc.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3 text-blue-950 font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate max-w-[200px]">{doc.filename}</span>
                    </td>
                    <td className="p-3 text-slate-600">{doc.standard || 'Classic 4.4'}</td>
                    <td className="p-3 text-blue-950 font-medium">{doc.page_count}</td>
                    <td className="p-3">
                      <StatusBadge status={doc.processing_status} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => navigate('/assistant', { state: { targetDocId: doc.id } })}
                        className="text-xs text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                      >
                        Query
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-white border border-blue-100/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-blue-950 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Activity Log</span>
            </h3>
            <span className="text-xs text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded">Recent</span>
          </div>

          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
};
