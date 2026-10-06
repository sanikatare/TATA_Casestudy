import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText,
  Send,
  Layers,
  Sparkles,
  ChevronRight,
  Loader2,
  Bot,
  CheckCircle2
} from 'lucide-react';
import { ChatMessage } from '../components/ChatMessage';
import { StatusBadge } from '../components/StatusBadge';
import { getDocuments, queryHLD, getHistory } from '../services/api';
import { DocumentItem, QueryRecord } from '../types/autosar';

const EXTRACTED_EXPLORER_CANDIDATES = {
  components: [
    { name: 'PowertrainCoordination_SWC', type: 'Application SW-C', asil: 'ASIL-D', ecu: 'Powertrain DC' },
    { name: 'Gateway_Router_SWC', type: 'Service Component', asil: 'ASIL-B', ecu: 'Central Gateway' },
    { name: 'BodyControl_SWC', type: 'Sensor-Actuator SW-C', asil: 'QM', ecu: 'Body Zonal Controller' },
    { name: 'Dem_BSW_Module', type: 'Diagnostic BSW Module', asil: 'ASIL-B', ecu: 'Central Gateway' },
    { name: 'CanIf_Driver', type: 'Communication Hardware Driver', asil: 'ASIL-B', ecu: 'Central Gateway' },
    { name: 'PduR_Router', type: 'PDU Router Module', asil: 'ASIL-B', ecu: 'Central Gateway' }
  ],
  interfaces: [
    { name: 'SR_TorqueRequest', kind: 'Sender-Receiver', elements: 'TorqueDemand_Nm (uint16)' },
    { name: 'SR_VehicleSpeed', kind: 'Sender-Receiver', elements: 'WheelSpeed_kph (float32)' },
    { name: 'CS_DiagRoutine_Service', kind: 'Client-Server', elements: 'StartRoutine(), StopRoutine()' },
    { name: 'SR_NetworkManagement', kind: 'Sender-Receiver', elements: 'BusSleepState (enum)' }
  ],
  ports: [
    { name: 'P_TorqueCoordination', kind: 'PPort', owner: 'PowertrainCoordination_SWC' },
    { name: 'R_TorqueGateway', kind: 'RPort', owner: 'Gateway_Router_SWC' },
    { name: 'P_SpeedBroadcast', kind: 'PPort', owner: 'BodyControl_SWC' },
    { name: 'PR_DiagServicePort', kind: 'PRPort', owner: 'Dem_BSW_Module' }
  ],
  signals: [
    { name: 'SIG_TorqueReq_0x120', bus: 'CAN-FD Ch 0', cycle: '10ms', length: '16 bits' },
    { name: 'SIG_SpeedEstimate_0x240', bus: 'CAN-FD Ch 0', cycle: '20ms', length: '32 bits' },
    { name: 'SIG_DemBusOffWarning', bus: 'Internal RTE', cycle: 'Event-triggered', length: '8 bits' }
  ],
  dependencies: [
    { from: 'PowertrainCoordination_SWC', to: 'Gateway_Router_SWC', via: 'CAN-FD PDU Router' },
    { from: 'Gateway_Router_SWC', to: 'Dem_BSW_Module', via: 'RTE Client-Server Call' },
    { from: 'BodyControl_SWC', to: 'Gateway_Router_SWC', via: 'LIN / CAN-FD Gateway' }
  ]
};

export const HLDAssistantPage: React.FC = () => {
  const location = useLocation();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [chatHistory, setChatHistory] = useState<QueryRecord[]>([]);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [activeExplorerTab, setActiveExplorerTab] = useState<'components' | 'interfaces' | 'ports' | 'signals' | 'dependencies'>('components');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      const docs = await getDocuments();
      setDocuments(docs);

      const targetId = (location.state as any)?.targetDocId;
      const initialTarget = docs.find(d => d.id === targetId) || docs[0] || null;
      setSelectedDoc(initialTarget);

      const history = await getHistory();
      setChatHistory(history);
    }
    init();
  }, [location.state]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleAskQuestion = async (queryText?: string) => {
    const q = queryText || questionInput;
    if (!q.trim()) return;

    setIsSubmitting(true);
    setQuestionInput('');

    try {
      const record = await queryHLD({
        question: q,
        document_id: selectedDoc?.id,
        top_k: 5
      });
      setChatHistory((prev) => [record, ...prev]);
    } catch (e) {
      console.error('Query execution failed', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col space-y-4">
      {/* Top Assistant Status Header */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
            <FileText className="w-4 h-4" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-500 uppercase font-semibold">Target Document:</span>
              <select
                value={selectedDoc?.id || ''}
                onChange={(e) => {
                  const doc = documents.find(d => d.id === e.target.value);
                  if (doc) setSelectedDoc(doc);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-900 font-mono text-xs px-2.5 py-1 rounded focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename} ({d.page_count} pages)
                  </option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Standard: {selectedDoc?.standard || 'AUTOSAR Classic 4.4'} · {selectedDoc?.chunk_count || 142} Vector Chunks
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Index Status:</span>
            <StatusBadge status="INDEXED" label="Indexed in ChromaDB" size="sm" />
          </div>

          <div className="flex items-center gap-1.5 text-slate-600">
            <span>Retrieved Sources:</span>
            <span className="text-blue-600 font-bold">Top-K = 5</span>
          </div>
        </div>
      </div>

      {/* Two-Panel Engineering AI Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* ========================================================
            LEFT PANEL: Document Explorer (Extracted Candidates)
           ======================================================== */}
        <div className="lg:col-span-4 rounded-xl bg-white border border-slate-200 flex flex-col min-h-0 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Document Explorer
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                AI Candidates
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-sans">
              Structural architectural entities parsed from {selectedDoc?.filename || 'selected HLD'}.
            </p>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
              {[
                { id: 'components', label: 'Components' },
                { id: 'interfaces', label: 'Interfaces' },
                { id: 'ports', label: 'Ports' },
                { id: 'signals', label: 'Signals' },
                { id: 'dependencies', label: 'Flows' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveExplorerTab(tab.id as any)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded whitespace-nowrap transition-colors cursor-pointer ${
                    activeExplorerTab === tab.id
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explorer Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-xs font-mono">
            {activeExplorerTab === 'components' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.components.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => setQuestionInput(`What are the interfaces and port bindings for ${c.name}?`)}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-900 font-bold group-hover:text-blue-600 transition-colors truncate">
                        {c.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                        c.asil === 'ASIL-D' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {c.asil}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-sans">{c.type}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Host: {c.ecu}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'interfaces' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.interfaces.map((iface, i) => (
                  <div
                    key={i}
                    onClick={() => setQuestionInput(`Explain the communication pattern and data elements of ${iface.name}`)}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-blue-600 font-bold group-hover:underline truncate">
                        {iface.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                        {iface.kind}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-sans mt-0.5">{iface.elements}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'ports' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.ports.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-900 font-bold truncate">{p.name}</span>
                      <span className="text-[10px] text-blue-700 px-1.5 rounded bg-blue-50 border border-blue-200">{p.kind}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Allocated to: {p.owner}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'signals' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.signals.map((s, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-amber-700 font-bold truncate">{s.name}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>Bus: {s.bus}</span>
                      <span>Cycle: {s.cycle}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'dependencies' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.dependencies.map((d, i) => (
                  <div key={i} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-slate-900 font-bold">
                      <span className="truncate">{d.from}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400 shrink-0 mx-1" />
                      <span className="truncate text-blue-600">{d.to}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Path: {d.via}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT PANEL: AI Assistant Chat & Citations
           ======================================================== */}
        <div className="lg:col-span-8 rounded-xl bg-white border border-slate-200 flex flex-col min-h-0 overflow-hidden shadow-xs">
          {/* Assistant Header Info */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                  AUTOSAR RAG Intelligence Workspace
                </h3>
                <div className="text-[11px] text-slate-500">
                  Strict zero-hallucination constraint with page-level citation audit.
                </div>
              </div>
            </div>

            <div className="text-xs font-mono text-emerald-700 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Grounded Model Ready</span>
            </div>
          </div>

          {/* Conversation Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-sm font-bold text-slate-900">Ask anything about the AUTOSAR HLD</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Query components, interfaces, signal mappings, or diagnostic routines. Every response includes page and section citations.
                  </p>
                </div>
              </div>
            ) : (
              chatHistory.map((item) => (
                <ChatMessage
                  key={item.id}
                  question={item.question}
                  answer={item.answer}
                  timestamp={item.timestamp}
                  citations={item.citations}
                  confidenceScore={item.confidence_score}
                />
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Question Input Box */}
          <div className="p-4 border-t border-slate-200 bg-white space-y-2 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="e.g. Which software components communicate with the Gateway ECU over CAN-FD?"
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 font-sans pr-10 focus:bg-white transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !questionInput.trim()}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Ask Question</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono px-1">
              <span>Grounding: <strong>Top-5 Chunks</strong></span>
              <span>FastAPI Endpoint: <code>POST /chat/query</code></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
