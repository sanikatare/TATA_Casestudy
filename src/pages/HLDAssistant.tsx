import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FileText,
  Send,
  Layers,
  ChevronRight,
  Loader2,
  Bot,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { ChatMessage } from '../components/ChatMessage';
import { getDocuments, queryHLD, getHistory, getArchitectureModel } from '../services/api';
import { DocumentItem, QueryRecord } from '../types/autosar';
import { useDomain, ECU_DOMAINS } from '../context/DomainContext';

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
  const [activeExplorerTab, setActiveExplorerTab] = useState<'components' | 'interfaces' | 'ports' | 'signals' | 'dependencies'>('components');
  const [backendError, setBackendError] = useState<string | null>(null);

  // Document-driven explorer state
  const [explorerData, setExplorerData] = useState<{
    components: any[];
    interfaces: any[];
    ports: any[];
    signals: any[];
    dependencies: any[];
  }>({
    components: [],
    interfaces: [],
    ports: [],
    signals: [],
    dependencies: [],
  });

  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Initial Load: Documents & History
  useEffect(() => {
    async function init() {
      setBackendError(null);
      try {
        const docs = await getDocuments();
        setDocuments(docs);

        const targetId = (location.state as any)?.targetDocId;
        const initialTarget = docs.find((d) => d.id === targetId) || docs[0] || null;
        setSelectedDoc(initialTarget);

        const history = await getHistory();
        setChatHistory(history);
      } catch (e: any) {
        console.error('Initialization failed', e);
        setBackendError(e?.message || 'Cannot connect to backend service');
      }
    }
    init();
  }, [location.state]);

  // 2. Load Real Architecture for Selected Document
  useEffect(() => {
    if (!selectedDoc) return;

    async function loadExplorer() {
      try {
        const arch = await getArchitectureModel(selectedDoc?.id);
        const compList = arch.components || [];
        const ifList = arch.interfaces || [];

        // Build ports from components
        const portsList: any[] = [];
        for (const c of compList) {
          for (const p of c.ports || []) {
            portsList.push({
              name: p,
              kind: p.startsWith('P_') ? 'PPort' : p.startsWith('R_') ? 'RPort' : 'PRPort',
              owner: c.name,
            });
          }
        }

        // Build signals from bus channels
        const signalsList: any[] = (arch.bus_matrix || []).map((b) => ({
          name: `${b.channel_name}_Traffic`,
          bus: b.channel_name,
          cycle: b.baud_rate_nominal,
        }));

        // Build dependencies from interfaces
        const depList: any[] = ifList
          .filter((i) => i.consumer_components.length > 0)
          .map((i) => ({
            from: i.provider_component,
            to: i.consumer_components[0],
            via: i.name,
          }));

        setExplorerData({
          components: compList.map((c) => ({
            name: c.name,
            type: c.component_type,
            asil: c.asil_level,
            ecu: c.ecu_allocation,
          })),
          interfaces: ifList.map((i) => ({
            name: i.name,
            kind: i.interface_type,
            elements: i.data_elements.join(' · '),
          })),
          ports: portsList,
          signals: signalsList,
          dependencies: depList,
        });
      } catch (err) {
        console.warn('Failed to load explorer data for selected document:', err);
      }
    }

    loadExplorer();
  }, [selectedDoc]);

  // Domain filter synchronization
  useEffect(() => {
    if (selectedDomain === 'ALL' || documents.length === 0) return;
    const domainDef = ECU_DOMAINS.find((d) => d.id === selectedDomain);
    if (!domainDef?.match) return;
    const matchStr = domainDef.match.toLowerCase();
    const matchDoc = documents.find(
      (d) =>
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
    setBackendError(null);

    try {
      const record = await queryHLD({
        question: q,
        document_id: selectedDoc?.id,
        top_k: 5,
      });

      setChatHistory((prev) => [record, ...prev]);
    } catch (e: any) {
      console.error('Query execution error', e);
      const errMsg = e?.message || 'Unknown network error';
      setBackendError(errMsg);
      const errorRecord: QueryRecord = {
        id: `err-${Date.now()}`,
        question: q,
        answer: `Backend Error: ${errMsg}`,
        document_id: selectedDoc?.id,
        document_name: selectedDoc?.filename || 'HLD Assistant',
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        confidence_score: 0.0,
        citations: [],
      };
      setChatHistory((prev) => [errorRecord, ...prev]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] min-h-[550px] space-y-4">
      {/* Backend Connection Error Banner */}
      {backendError && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#1e40af] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs shrink-0">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#1e40af] shrink-0" />
            <div>
              <span className="font-bold">Backend Alert:</span> {backendError}
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-[#1e40af] text-white rounded-lg font-semibold hover:bg-blue-900 transition-colors shrink-0 cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Top Controls - Document Selector */}
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
                const target = documents.find((d) => d.id === e.target.value);
                if (target) setSelectedDoc(target);
              }}
              className="text-xs font-semibold bg-white border border-blue-200 text-blue-950 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs cursor-pointer"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename} ({d.ecu_domain || 'General'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-blue-900">{selectedDoc?.standard || 'AUTOSAR Classic 4.4'}</span>
          <span className="text-blue-200">·</span>
          <span>{selectedDoc?.chunk_count || 0} Chunks</span>

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
                { id: 'components', label: `Components (${explorerData.components.length})` },
                { id: 'interfaces', label: `Interfaces (${explorerData.interfaces.length})` },
                { id: 'ports', label: `Ports (${explorerData.ports.length})` },
                { id: 'signals', label: `Signals (${explorerData.signals.length})` },
                { id: 'dependencies', label: `Flows (${explorerData.dependencies.length})` },
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
                {explorerData.components.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No components extracted from this document.</div>
                ) : (
                  explorerData.components.map((c, i) => (
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
                  ))
                )}
              </div>
            )}

            {activeExplorerTab === 'interfaces' && (
              <div className="space-y-2">
                {explorerData.interfaces.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No interfaces extracted from this document.</div>
                ) : (
                  explorerData.interfaces.map((iface, i) => (
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
                  ))
                )}
              </div>
            )}

            {activeExplorerTab === 'ports' && (
              <div className="space-y-2">
                {explorerData.ports.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No ports extracted from this document.</div>
                ) : (
                  explorerData.ports.map((p, i) => (
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
                  ))
                )}
              </div>
            )}

            {activeExplorerTab === 'signals' && (
              <div className="space-y-2">
                {explorerData.signals.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No bus channels extracted from this document.</div>
                ) : (
                  explorerData.signals.map((s, i) => (
                    <div
                      key={i}
                      onClick={() => handleAskQuestion(`What is the nominal and data bitrate for ${s.bus}?`)}
                      className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/80 hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer group"
                    >
                      <div className="text-blue-950 font-bold group-hover:text-blue-600 truncate">{s.name}</div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span className="text-blue-700 font-semibold">{s.bus}</span>
                        <span>{s.cycle}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeExplorerTab === 'dependencies' && (
              <div className="space-y-2">
                {explorerData.dependencies.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No component dependencies detected.</div>
                ) : (
                  explorerData.dependencies.map((d, i) => (
                    <div
                      key={i}
                      onClick={() => handleAskQuestion(`How do ${d.from} and ${d.to} communicate via ${d.via}?`)}
                      className="p-3 rounded-lg bg-blue-50/40 border border-blue-100/80 hover:border-blue-400 hover:bg-blue-50/80 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-1 font-semibold text-blue-950 text-xs">
                        <span className="truncate">{d.from}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{d.to}</span>
                      </div>
                      <div className="text-[11px] text-blue-700 font-mono mt-1">{d.via}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Panel */}
        <div className="lg:col-span-8 rounded-xl bg-white border border-blue-100/90 shadow-2xs flex flex-col min-h-0 overflow-hidden">
          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="p-3.5 rounded-full bg-blue-50 text-blue-600">
                  <Bot className="w-8 h-8" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="font-bold text-sm text-blue-950">Grounded AUTOSAR Architecture Assistant</h3>
                  <p className="text-xs text-slate-500">
                    Ask technical questions regarding SW-C allocations, RTE port contracts, ISO 26262 ASIL decomposition, or bus matrix configurations with verifiable page citations.
                  </p>
                </div>

                {/* Suggested Queries */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg mt-2 text-left">
                  {SUGGESTED_QUERIES.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskQuestion(q)}
                      className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-300 text-xs text-slate-700 transition-all text-left cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  question={msg.question}
                  answer={msg.answer}
                  timestamp={msg.timestamp}
                  citations={msg.citations}
                  confidenceScore={msg.confidence_score}
                />
              ))
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-blue-50 bg-white">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskQuestion();
              }}
              className="flex items-center gap-3"
            >
              <input
                type="text"
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Ask an AUTOSAR architectural or safety requirement question..."
                disabled={isSubmitting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-blue-200 text-xs bg-slate-50/50 focus:bg-white text-blue-950 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isSubmitting || !questionInput.trim()}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-200 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Ask</span>
                    <Send className="w-3.5 h-3.5" />
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
