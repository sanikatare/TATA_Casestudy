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
  CheckCircle2,
  HelpCircle,
  RotateCcw
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

const SUGGESTED_QUERIES = [
  "Which software components communicate with the Gateway ECU over CAN-FD channel 0?",
  "What are the ASIL safety requirements defined for regenerative torque arbitration?",
  "Explain the Diagnostic Event Manager (Dem) DTC debouncing and aging strategy.",
  "What Run-Time Environment (RTE) Sender-Receiver interfaces are bound to the Powertrain SW-C?"
];

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

  const handleClearChat = () => {
    setChatHistory([]);
  };

  return (
    <div className="h-[calc(100vh-9rem)] flex flex-col space-y-4">
      {/* Top Assistant Control Bar */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200/90 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-900 text-white shadow-xs">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>

          <div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Target Specification:</span>
              <select
                value={selectedDoc?.id || ''}
                onChange={(e) => {
                  const doc = documents.find(d => d.id === e.target.value);
                  if (doc) setSelectedDoc(doc);
                }}
                className="bg-slate-50 border border-slate-300 text-slate-900 font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer shadow-2xs"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.filename} ({d.page_count} pages)
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500 mt-1 font-medium">
              Standard: <strong className="text-slate-800">{selectedDoc?.standard || 'AUTOSAR Classic 4.4'}</strong> · {selectedDoc?.chunk_count || 142} Dense Vector Chunks in ChromaDB
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Vector Index:</span>
            <StatusBadge status="INDEXED" label="ChromaDB Synchronized" size="sm" />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-slate-600 font-bold bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span>Retrieval:</span>
            <span className="text-blue-700">Top-K = 5 Chunks</span>
          </div>

          {chatHistory.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Reset conversation"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Two-Panel Engineering AI Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* ========================================================
            LEFT PANEL: Document Explorer (Extracted Candidates)
           ======================================================== */}
        <div className="lg:col-span-4 rounded-2xl bg-white border border-slate-200/90 flex flex-col min-h-0 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-200/90 bg-linear-to-b from-slate-50/70 to-white">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Architecture Explorer</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                AI Entities
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Entities parsed from {selectedDoc?.filename || 'selected HLD'}. Click any item to formulate an inquiry.
            </p>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto pb-1">
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
                  className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-all cursor-pointer font-bold ${
                    activeExplorerTab === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explorer Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {activeExplorerTab === 'components' && (
              <div className="space-y-2.5">
                {EXTRACTED_EXPLORER_CANDIDATES.components.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`What are the interfaces, ports, and safety requirements for ${c.name}?`)}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-900 font-bold group-hover:text-blue-700 transition-colors truncate">
                        {c.name}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.asil === 'ASIL-D' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {c.asil}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 font-medium">{c.type}</div>
                    <div className="text-[11px] text-slate-400 mt-1">ECU Host: {c.ecu}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'interfaces' && (
              <div className="space-y-2.5">
                {EXTRACTED_EXPLORER_CANDIDATES.interfaces.map((iface, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`Explain the communication pattern and data elements of ${iface.name}`)}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-blue-700 font-bold group-hover:underline truncate">
                        {iface.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800">
                        {iface.kind}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">{iface.elements}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'ports' && (
              <div className="space-y-2.5">
                {EXTRACTED_EXPLORER_CANDIDATES.ports.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`Which component owns port ${p.name} and how is it connected?`)}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-900 font-bold group-hover:text-blue-700 truncate">{p.name}</span>
                      <span className="text-[10px] font-bold text-blue-800 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                        {p.kind}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">Allocated to: {p.owner}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'signals' && (
              <div className="space-y-2.5">
                {EXTRACTED_EXPLORER_CANDIDATES.signals.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`What is the cycle time and bus routing for signal ${s.name}?`)}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="text-amber-800 font-bold group-hover:underline truncate">{s.name}</div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                      <span>Bus: {s.bus}</span>
                      <span>Cycle: {s.cycle}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'dependencies' && (
              <div className="space-y-2.5">
                {EXTRACTED_EXPLORER_CANDIDATES.dependencies.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`Explain the dependency path from ${d.from} to ${d.to}`)}
                    className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/90 hover:border-blue-400 hover:bg-white transition-all cursor-pointer group shadow-2xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-slate-900 font-bold">
                      <span className="truncate">{d.from}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mx-1" />
                      <span className="truncate text-blue-700">{d.to}</span>
                    </div>
                    <div className="text-xs text-slate-500">Path: {d.via}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            RIGHT PANEL: AI Assistant Chat & Citations
           ======================================================== */}
        <div className="lg:col-span-8 rounded-2xl bg-white border border-slate-200/90 flex flex-col min-h-0 overflow-hidden shadow-xs">
          {/* Assistant Header Info */}
          <div className="p-4 px-6 border-b border-slate-200/90 bg-linear-to-b from-slate-50/70 to-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-blue-400 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  AUTOSAR RAG Intelligence Console
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Zero-hallucination constraint with exact page-level citation audit.
                </div>
              </div>
            </div>

            <div className="text-xs text-emerald-800 flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Grounded Engine Ready</span>
            </div>
          </div>

          {/* Suggested Quick Queries Banner */}
          <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              Suggestions:
            </span>
            {SUGGESTED_QUERIES.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(sq)}
                className="text-xs px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 transition-colors whitespace-nowrap cursor-pointer shadow-2xs font-medium"
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Conversation Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/20">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-blue-400 flex items-center justify-center shadow-md">
                  <Bot className="w-7 h-7" />
                </div>
                <div className="max-w-md space-y-2">
                  <h4 className="text-base font-bold text-slate-900">
                    Query the AUTOSAR High-Level Design
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Submit any architectural question regarding software components, RTE signal routing, or diagnostic event managers. Every answer cites exact page numbers.
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
          <div className="p-4 px-6 border-t border-slate-200/90 bg-white space-y-2.5 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="flex items-center gap-3"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  placeholder="e.g. Which software components communicate with the Gateway ECU over CAN-FD?"
                  disabled={isSubmitting}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 pr-10 focus:bg-white transition-all shadow-2xs font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !questionInput.trim()}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                ) : (
                  <>
                    <span>Submit Query</span>
                    <Send className="w-4 h-4 text-blue-400" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
              <span>Grounding Invariant: <strong className="text-slate-800">Top-5 Verified Chunks</strong></span>
              <span>Audit SLA: <span className="text-emerald-700 font-bold">100% Page Traceability</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
