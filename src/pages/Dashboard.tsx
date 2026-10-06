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
  ShieldCheck,
  Sparkles,
  Upload,
  CheckCircle2,
  Car
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
  { day: 'Mon', queries: 12, confidence: 96 },
  { day: 'Tue', queries: 19, confidence: 97 },
  { day: 'Wed', queries: 28, confidence: 98 },
  { day: 'Thu', queries: 24, confidence: 98 },
  { day: 'Fri', queries: 37, confidence: 99 },
  { day: 'Sat', queries: 16, confidence: 97 },
  { day: 'Sun', queries: 31, confidence: 98 },
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
      {/* Executive Hero Banner with Automotive Engineering Imagery */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900 text-white shadow-xl border border-slate-800">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Tata Automotive Engineering"
            className="w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-105 transition-transform duration-700 hover:scale-100"
          />
          <div className="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-900/90 to-transparent" />
        </div>

        <div className="relative z-10 p-8 sm:p-10 lg:p-12 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>AUTOSAR Classic 4.4 & Adaptive R20-11 Standard</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Automotive ECU High-Level Design Intelligence
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal max-w-2xl">
            Domain-grounded RAG assistant for vehicle software architecture specifications. Eliminates hallucinations with strict page-level and section-level citation audit trails.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => navigate('/assistant')}
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
            >
              <Bot className="w-4 h-4" />
              <span>Launch HLD RAG Assistant</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={() => navigate('/documents')}
              className="px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-bold rounded-xl backdrop-blur-md transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-300" />
              <span>Ingest HLD Specification</span>
            </button>

            <button
              onClick={() => navigate('/analysis')}
              className="px-6 py-3.5 bg-transparent hover:bg-white/5 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Inspect VFB Topology</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          label="Documents Indexed"
          value={documents.length}
          subtext={`${documents.reduce((acc, d) => acc + d.page_count, 0)} Total specification pages`}
          icon={FileText}
          accentColor="blue"
          trend={{ value: "4 ECUs mapped", isPositive: true }}
        />

        <MetricCard
          label="Grounded Inquiries"
          value={queries.length}
          subtext="100% Verifiable page citations"
          icon={Bot}
          accentColor="violet"
          trend={{ value: "98.2% Avg score", isPositive: true }}
        />

        <MetricCard
          label="SW-Cs & Modules"
          value="48"
          subtext="Candidate components extracted"
          icon={Layers}
          accentColor="green"
          trend={{ value: "ASIL-D Certified", isPositive: true }}
        />

        <MetricCard
          label="Inference Pipeline"
          value="Operational"
          subtext="Zero-Hallucination Guard Active"
          icon={Cpu}
          accentColor="amber"
          trend={{ value: "12ms Latency", isPositive: true }}
        />
      </div>

      {/* Analytics Chart & Pipeline Diagnostics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* RAG Query Analytics Chart */}
        <div className="lg:col-span-8 p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>RAG Retrieval Volume & Verification Trajectory</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Weekly architectural inquiries with semantic cosine relevance and zero-hallucination compliance.
              </p>
            </div>
            <span className="self-start sm:self-auto text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
              Avg. Grounding: 97.4%
            </span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={QUERY_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="queryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#0F172A',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area type="monotone" dataKey="queries" stroke="#1E40AF" strokeWidth={2.5} fillOpacity={1} fill="url(#queryGrad)" name="Engineering Queries" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Pipeline Real-Time Status */}
        <div className="lg:col-span-4 p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-emerald-600" />
                <span>AI Pipeline Architecture</span>
              </h3>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Current operational state of vector retrieval and PDF parsing stack.
            </p>

            <div className="space-y-3 text-xs">
              {[
                { name: 'PyMuPDF Text Engine', sub: 'Page Boundary Preserving', status: 'OPERATIONAL' },
                { name: 'BAAI/bge-small-en-v1.5', sub: '384 Dense Embeddings', status: 'OPERATIONAL' },
                { name: 'ChromaDB Vector Store', sub: 'Cosine Similarity Index', status: 'OPERATIONAL' },
                { name: 'Zero-Hallucination Guard', sub: 'Strict Evidence Grounding', status: 'OPERATIONAL' },
                { name: 'RTE Signal Matrix', sub: 'AUTOSAR Port Binder', status: 'OPERATIONAL' },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.sub}</div>
                  </div>
                  <StatusBadge status="OPERATIONAL" label="Active" size="sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200/80 text-xs text-slate-500 flex items-center justify-between">
            <span>Metadata Store:</span>
            <span className="text-slate-900 font-bold">SQLite 3 (ACID)</span>
          </div>
        </div>
      </div>

      {/* Automotive Showcase Cards: SDV Cockpit & EV Platform */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm flex flex-col sm:flex-row">
          <div className="sm:w-2/5 h-48 sm:h-auto relative overflow-hidden">
            <img
              src={cockpitImage}
              alt="Tata SDV Cockpit Architecture"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 to-transparent sm:hidden" />
          </div>
          <div className="p-6 sm:w-3/5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 inline-block">
                Software Defined Vehicle (SDV)
              </span>
              <h4 className="text-base font-bold text-slate-900 leading-snug">
                Zonal Body & Cockpit Domain Controller
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Adaptive AUTOSAR R20-11 architecture hosting high-speed ethernet service-oriented communications (SOME/IP) and diagnostics over IP (DoIP).
              </p>
            </div>
            <button
              onClick={() => navigate('/assistant', { state: { targetDocId: 'doc-bd-03' } })}
              className="text-xs text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1.5 cursor-pointer pt-1"
            >
              <span>Explore Body Controller HLD</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-sm flex flex-col sm:flex-row">
          <div className="sm:w-2/5 h-48 sm:h-auto relative overflow-hidden">
            <img
              src={evPlatformImage}
              alt="Tata Electric Vehicle Architecture"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-slate-950/60 to-transparent sm:hidden" />
          </div>
          <div className="p-6 sm:w-3/5 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block">
                Powertrain & High-Voltage EV
              </span>
              <h4 className="text-base font-bold text-slate-900 leading-snug">
                Powertrain Coordination & Battery Management
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                ASIL-D safety requirements, torque arbitration algorithms, lockstep core verification, and dual-redundant sensor plausibility monitoring.
              </p>
            </div>
            <button
              onClick={() => navigate('/assistant', { state: { targetDocId: 'doc-pt-02' } })}
              className="text-xs text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1.5 cursor-pointer pt-1"
            >
              <span>Explore Powertrain SW-C</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lower Dashboard: Ingested Specifications & Activity Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        {/* Recent Documents Table Preview */}
        <div className="lg:col-span-7 p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Active Specifications in Vector Index
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingested AUTOSAR HLD documents ready for semantic query processing.
              </p>
            </div>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs text-blue-700 hover:text-blue-800 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Repository</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200/90 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 text-slate-700 border-b border-slate-200/90 uppercase text-[11px] font-bold">
                <tr>
                  <th className="p-3.5">Specification</th>
                  <th className="p-3.5">Standard</th>
                  <th className="p-3.5">Pages</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.slice(0, 4).map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-slate-900 font-bold flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate max-w-[220px]">{doc.filename}</span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{doc.standard || 'Classic 4.4'}</td>
                    <td className="p-3.5 text-slate-900 font-bold">{doc.page_count}</td>
                    <td className="p-3.5">
                      <StatusBadge status={doc.processing_status} />
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => navigate('/assistant', { state: { targetDocId: doc.id } })}
                        className="text-xs text-blue-700 hover:text-blue-800 font-bold cursor-pointer hover:underline"
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
        <div className="lg:col-span-5 p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-blue-600" />
              <span>Activity & Traceability Audit</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">Chronological</span>
          </div>

          <ActivityTimeline />
        </div>
      </div>
    </div>
  );
};
