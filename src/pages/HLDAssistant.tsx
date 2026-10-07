import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText,
  Send,
  Layers,
  ChevronRight,
  Loader2,
  Bot,
  RotateCcw
} from 'lucide-react';
import { ChatMessage } from '../components/ChatMessage';
import { getDocuments, queryHLD, getHistory } from '../services/api';
import { DocumentItem, QueryRecord } from '../types/autosar';
import { useDomain, ECU_DOMAINS } from '../context/DomainContext';

const EXTRACTED_EXPLORER_CANDIDATES = {
  components: [
    { name: 'PowertrainCoordination_SWC', type: 'Application SW-C', asil: 'ASIL-D', ecu: 'Powertrain DC' },
    { name: 'Gateway_Router_SWC', type: 'Service Component', asil: 'ASIL-B', ecu: 'Central Gateway' },
    { name: 'BodyControl_SWC', type: 'Sensor-Actuator SW-C', asil: 'QM', ecu: 'Body Controller' },
    { name: 'Dem_BSW_Module', type: 'Diagnostic BSW Module', asil: 'ASIL-B', ecu: 'Central Gateway' },
    { name: 'CanIf_Driver', type: 'Comm Driver', asil: 'ASIL-B', ecu: 'Central Gateway' },
    { name: 'PduR_Router', type: 'PDU Router', asil: 'ASIL-B', ecu: 'Central Gateway' }
  ],
  interfaces: [
    { name: 'SR_TorqueRequest', kind: 'Sender-Receiver', elements: 'TargetTorque_Nm (uint16), PlausibilityFlag' },
    { name: 'SR_VehicleSpeed', kind: 'Sender-Receiver', elements: 'VehicleSpeed_kph (float32)' },
    { name: 'CS_DiagnosticSession', kind: 'Client-Server', elements: 'SetSession(SessionType), Status' },
    { name: 'SR_BatteryPackState', kind: 'Sender-Receiver', elements: 'StateOfCharge_pct (uint8), PackVoltage_V' }
  ],
  ports: [
    { name: 'Pp_TorqueArbitrated', kind: 'PPort', owner: 'PowertrainCoordination_SWC' },
    { name: 'R_CAN0_Rx', kind: 'RPort', owner: 'Gateway_Router_SWC' },
    { name: 'P_VehicleSpeedBroadcast', kind: 'PPort', owner: 'Gateway_Router_SWC' },
    { name: 'R_BMS_Telemetry', kind: 'RPort', owner: 'PowertrainCoordination_SWC' }
  ],
  signals: [
    { name: 'CAN_FD_TorqueCmd_0x140', bus: 'CAN-FD Ch0', cycle: '10ms' },
    { name: 'ETH_ADAS_Trajectory_0x400', bus: '100BASE-T1', cycle: '20ms' },
    { name: 'LIN_DoorMirrorState_0x22', bus: 'LIN Sub 2', cycle: '100ms' },
    { name: 'CAN_HV_BMS_Alert_0x080', bus: 'CAN-FD Ch1', cycle: '5ms' }
  ],
  dependencies: [
    { from: 'PowertrainCoordination_SWC', to: 'Inverter_Actuator_SWC', via: 'RTE (Zero-Copy)' },
    { from: 'Gateway_Router_SWC', to: 'DiagnosticEventManager', via: 'BSW Service API' },
    { from: 'BodyControl_SWC', to: 'Lighting_Actuator_SWC', via: 'LIN Sub-bus' },
    { from: 'ADAS_Planner_SWC', to: 'PowertrainCoordination_SWC', via: 'Automotive Ethernet' }
  ]
};

const SUGGESTED_QUERIES = [
  "Which software components communicate over CAN-FD channel 0?",
  "What safety requirements are defined for regenerative torque arbitration?",
  "Explain Diagnostic Event Manager (Dem) DTC debouncing.",
  "Which RTE interfaces are bound to PowertrainCoordination_SWC?"
];

export const HLDAssistantPage: React.FC = () => {
  const location = useLocation();
  const { selectedDomain } = useDomain();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [chatHistory, setChatHistory] = useState<QueryRecord[]>([]);
  const [questionInput, setQuestionInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [activeExplorerTab, setActiveExplorerTab] = useState<'components' | 'interfaces' | 'ports' | 'signals' | 'dependencies'>('components');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function init() {
      try {
        const [docs, history] = await Promise.all([getDocuments(), getHistory()]);
        setDocuments(docs);
        setChatHistory(history);
        const targetId = (location.state as any)?.targetDocId;
        const initialTarget = docs.find(d => d.id === targetId) || docs[0] || null;
        setSelectedDoc(initialTarget);
        setLoadError(null);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Unable to connect to backend services.');
      }
    }
    init();
  }, [location.state]);

  useEffect(() => {
    if (selectedDomain === 'ALL' || documents.length === 0) return;
    const domainDef = ECU_DOMAINS.find(d => d.id === selectedDomain);
    if (!domainDef?.match) return;
    const matchStr = domainDef.match.toLowerCase();
    const matchDoc = documents.find(d =>
      (d.ecu_domain || '').toLowerCase().includes(matchStr) ||
      (d.filename || '').toLowerCase().includes(matchStr)
    );
    if (matchDoc && matchDoc.id !== selectedDoc?.id) {
      setSelectedDoc(matchDoc);
    }
  }, [selectedDomain, documents]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleAskQuestion = async (queryText?: string) => {
    const q = queryText || questionInput;
    if (!q.trim()) return;

    setIsSubmitting(true);
    setQuestionInput('');

    try {
      setQueryError(null);
      const record = await queryHLD({
        question: q,
        document_id: selectedDoc?.id,
        top_k: 5
      });
      setChatHistory((prev) => [record, ...prev]);
    } catch (e) {
      console.error('Query execution failed', e);
      setQueryError(e instanceof Error ? e.message : 'Query failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[550px] space-y-4">
      {/* Top Controls - Blue & White */}
      {loadError && (
        <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-semibold">
          {loadError}
        </div>
      )}

      <div className="p-4 rounded-xl bg-white border border-blue-100/90 shadow-2xs flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-600 text-white shadow-xs shadow-blue-500/20">
            <FileText className="w-4 h-4" />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">Specification:</span>
            <select
              value={selectedDoc?.id || ''}
              onChange={(e) => {
                const doc = documents.find(d => d.id === e.target.value);
                if (doc) setSelectedDoc(doc);
              }}
              className="bg-blue-50/50 border border-blue-200 text-blue-950 font-bold text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.page_count} pages)
                </option>
              ))}
            </select>
          </div>
        </div>

        {queryError && (
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 font-semibold">
            {queryError}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-blue-950 font-medium">
          <span>{selectedDoc?.standard || 'AUTOSAR Classic 4.4'}</span>
          <span className="text-blue-200">·</span>
          <span>{selectedDoc?.chunk_count || 3} Chunks</span>

          {chatHistory.length > 0 && (
            <button
              onClick={handleClearChat}
              title="Clear chat"
              className="p-1.5 text-slate-400 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer ml-2"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Two-Panel Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
        {/* Left Explorer Panel */}
        <div className="lg:col-span-4 rounded-xl bg-white border border-blue-100/90 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b border-blue-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span>Architecture Explorer</span>
              </h3>
            </div>

            {/* Sub-tab Navigation */}
            <div className="flex items-center gap-1 overflow-x-auto">
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
                  className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap transition-all cursor-pointer font-semibold ${
                    activeExplorerTab === tab.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Explorer Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {activeExplorerTab === 'components' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.components.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`What are the interfaces, ports, and safety requirements for ${c.name}?`)}
                    className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/80 hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-blue-950 font-bold group-hover:text-blue-600 transition-colors truncate">
                        {c.name}
                      </span>
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                        {c.asil}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{c.type} · {c.ecu}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'interfaces' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.interfaces.map((iface, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`Explain the communication pattern and data elements of ${iface.name}`)}
                    className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/80 hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-blue-600 font-bold group-hover:underline truncate">
                        {iface.name}
                      </span>
                      <span className="text-[10px] text-blue-900 font-medium">
                        {iface.kind}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{iface.elements}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'ports' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.ports.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`Which component owns port ${p.name} and how is it connected?`)}
                    className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/80 hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-blue-950 font-bold group-hover:text-blue-600 truncate">{p.name}</span>
                      <span className="text-[10px] text-blue-600 font-bold">
                        {p.kind}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{p.owner}</div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'signals' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.signals.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`What is the cycle time and bus routing for signal ${s.name}?`)}
                    className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/80 hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer group"
                  >
                    <div className="text-blue-950 font-bold group-hover:text-blue-600 truncate">{s.name}</div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span className="text-blue-700 font-semibold">{s.bus}</span>
                      <span>{s.cycle}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeExplorerTab === 'dependencies' && (
              <div className="space-y-2">
                {EXTRACTED_EXPLORER_CANDIDATES.dependencies.map((d, i) => (
                  <div
                    key={i}
                    onClick={() => handleAskQuestion(`Explain the dependency path from ${d.from} to ${d.to}`)}
                    className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/80 hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer group space-y-1"
                  >
                    <div className="flex items-center justify-between text-blue-950 font-bold">
                      <span className="truncate">{d.from}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mx-1" />
                      <span className="truncate text-blue-600">{d.to}</span>
                    </div>
                    <div className="text-xs text-slate-500">{d.via}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="lg:col-span-8 rounded-xl bg-white border border-blue-100/90 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="p-3.5 px-5 border-b border-blue-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.7)] animate-pulse" />
              <h3 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                Architecture Assistant
              </h3>
            </div>
            <span className="text-[11px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">Page-Grounded Synthesis</span>
          </div>

          {/* Quick Suggestions */}
          <div className="px-5 py-2.5 bg-blue-50/40 border-b border-blue-50 flex items-center gap-2 overflow-x-auto shrink-0">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider shrink-0">
              Suggestions:
            </span>
            {SUGGESTED_QUERIES.map((sq, idx) => (
              <button
                key={idx}
                onClick={() => handleAskQuestion(sq)}
                className="text-xs px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-900 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-colors whitespace-nowrap cursor-pointer font-semibold shadow-2xs"
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-blue-50/15">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white shadow-xs shadow-blue-500/25 flex items-center justify-center">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="max-w-sm space-y-1">
                  <h4 className="text-sm font-bold text-blue-950">
                    Query Specification
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Ask questions about software components, port interfaces, signals, or diagnostic configurations. Every answer cites source pages.
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

          {/* Question Input */}
          <div className="p-4 border-t border-blue-50 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="flex items-center gap-2.5"
            >
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Ask about components, interfaces, or bus routing..."
                disabled={isSubmitting}
                className="flex-1 bg-blue-50/30 border border-blue-200 rounded-lg px-3.5 py-2.5 text-xs text-blue-950 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
              />

              <button
                type="submit"
                disabled={isSubmitting || !questionInput.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs shadow-blue-500/25"
              >
                {isSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <>
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5 text-white" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
