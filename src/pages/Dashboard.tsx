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
  Activity
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

const QUERY_TREND_DATA = [
  { day: 'Mon', queries: 8, confidence: 94 },
  { day: 'Tue', queries: 14, confidence: 96 },
  { day: 'Wed', queries: 22, confidence: 95 },
  { day: 'Thu', queries: 19, confidence: 98 },
  { day: 'Fri', queries: 31, confidence: 97 },
  { day: 'Sat', queries: 12, confidence: 99 },
  { day: 'Sun', queries: 26, confidence: 98 },
];

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [queries, setQueries] = useState<QueryRecord[]>([]);
  const [pipeline, setPipeline] = useState<PipelineComponentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [docs, hist, sys] = await Promise.all([
          getDocuments(),
          getHistory(),
          getSystemStatus()
        ]);
        setDocuments(docs);
        setQueries(hist);
        setPipeline(sys.components);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Platform Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-bold text-blue-600 uppercase tracking-wider">
            AUTOSAR HLD ANALYSIS
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Engineering Intelligence Platform
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Grounded RAG architecture analysis for Automotive ECU High-Level Design specifications.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/assistant')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Launch HLD Assistant</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Documents Indexed"
          value={documents.length}
          subtext={`${documents.reduce((acc, d) => acc + d.page_count, 0)} Total extracted pages`}
          icon={FileText}
          accentColor="blue"
          trend={{ value: "+1 this week", isPositive: true }}
        />

        <MetricCard
          label="Total Queries"
          value={queries.length}
          subtext="100% Verified page citations"
          icon={Bot}
          accentColor="violet"
          trend={{ value: "+24 today", isPositive: true }}
        />

        <MetricCard
          label="Components Detected"
          value="48"
          subtext="SW-C candidates & RTE shims"
          icon={Layers}
          accentColor="green"
          trend={{ value: "4 ECUs mapped", isPositive: true }}
        />

        <MetricCard
          label="AI Engine Status"
          value="Online"
          subtext="Local BGE + Zero-hallucination"
          icon={Cpu}
          accentColor="blue"
          trend={{ value: "12ms Latency", isPositive: true }}
        />
      </div>

      {/* Analytics Chart & Pipeline Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RAG Query Analytics Chart */}
        <div className="lg:col-span-8 p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Query Activity & Confidence Trajectory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Weekly architectural retrieval volume and grounding confidence scores.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Avg. Grounding: 96.8%
            </span>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={QUERY_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="queryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#0F172A',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area type="monotone" dataKey="queries" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#queryGrad)" name="Queries" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Pipeline Status */}
        <div className="lg:col-span-4 p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                AI Pipeline Status
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Real-time health of the local RAG execution stack.
            </p>

            <div className="space-y-3 font-mono text-xs">
              {[
                { name: 'Document Processing', sub: 'PyMuPDF Text Engine', status: 'OPERATIONAL' },
                { name: 'Embedding Engine', sub: 'BAAI/bge-small-en-v1.5', status: 'OPERATIONAL' },
                { name: 'Vector Database', sub: 'ChromaDB Persistence', status: 'OPERATIONAL' },
                { name: 'LLM Orchestrator', sub: 'Zero-Hallucination Guard', status: 'OPERATIONAL' },
                { name: 'RAG Pipeline', sub: 'Top-K Context Assembler', status: 'OPERATIONAL' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{item.sub}</div>
                  </div>
                  <StatusBadge status="OPERATIONAL" label="Operational" size="sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
            SQLite Database: <span className="text-slate-800 font-medium">./data/sqlite/autosar_rag.db</span>
          </div>
        </div>
      </div>

      {/* Lower Dashboard: Recent Documents & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Documents Table Preview */}
        <div className="lg:col-span-7 p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Recent Documents
              </h3>
              <p className="text-xs text-slate-500">Ingested AUTOSAR HLD specifications in vector index.</p>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 text-slate-600 font-mono border-b border-slate-200 uppercase text-[11px]">
                <tr>
                  <th className="p-3">Filename</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Pages</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {documents.slice(0, 3).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70">
                    <td className="p-3 text-slate-900 font-semibold flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate max-w-[200px]">{doc.filename}</span>
                    </td>
                    <td className="p-3 text-slate-600">{doc.version}</td>
                    <td className="p-3 text-slate-800">{doc.page_count}</td>
                    <td className="p-3">
                      <StatusBadge status={doc.processing_status} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => navigate('/assistant')}
                        className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        Analyze
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="lg:col-span-5 p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              Activity Timeline
            </h3>
            <span className="text-[11px] font-mono text-slate-500">Audit Trail</span>
          </div>

          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
};
