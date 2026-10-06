import React, { useState } from 'react';
import { Layers, ShieldAlert } from 'lucide-react';
import { SoftwareComponent, PortInterface } from '../types/autosar';

interface ArchitectureGraphProps {
  components: SoftwareComponent[];
  interfaces: PortInterface[];
}

export const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({ components, interfaces }) => {
  const [selectedComponent, setSelectedComponent] = useState<SoftwareComponent>(components[0]);

  return (
    <div className="space-y-6">
      {/* Notice on AI-Extracted Candidate status */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-900">
            AI-Extracted Candidate Architecture
          </div>
          <p className="text-[11px] leading-relaxed text-amber-800">
            The software components, interfaces, and port bindings below are extracted automatically by semantic parsing and RAG entity recognition from the ingested AUTOSAR High-Level Design document. This output represents <strong>AI-extracted candidates</strong> and does not constitute formally verified OEM safety release artifacts under ISO 26262.
          </p>
        </div>
      </div>

      {/* Interactive ECU Architecture Topology Visualizer */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              AUTOSAR Virtual Functional Bus (VFB) Architecture Map
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Click a component block to inspect interface allocations, safety decomposition, and port mappings.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            Candidate Topology
          </span>
        </div>

        {/* Component Topology Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {components.map((comp) => {
            const isSelected = selectedComponent.name === comp.name;
            return (
              <button
                key={comp.name}
                onClick={() => setSelectedComponent(comp)}
                className={`p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-400 shadow-xs'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    comp.asil === 'ASIL-D'
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : comp.asil === 'ASIL-B'
                      ? 'bg-amber-100 text-amber-700 border border-amber-200'
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {comp.asil}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{comp.periodicity}</span>
                </div>

                <div className="font-bold text-xs text-slate-900 truncate" title={comp.name}>
                  {comp.name}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 truncate">{comp.type}</div>

                <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{comp.ports.length} Ports</span>
                  <span className="text-blue-600 font-medium">{comp.ecu}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Component Deep-Dive Inspector */}
        <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              Component Candidate Details
            </span>
            <div className="text-base font-bold text-slate-900 font-mono">{selectedComponent.name}</div>
            <div className="text-xs text-slate-700">
              Allocated ECU: <strong className="text-slate-900">{selectedComponent.ecu}</strong>
            </div>
            <div className="text-xs text-slate-700">
              Execution Rate: <strong className="text-blue-600 font-mono">{selectedComponent.periodicity}</strong>
            </div>
            <div className="text-xs text-slate-700">
              Safety Classification: <strong className="text-amber-700 font-mono">{selectedComponent.asil}</strong>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
              Bound AUTOSAR Ports (PPort / RPort)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedComponent.ports.map((port, pIdx) => (
                <div key={pIdx} className="p-2.5 rounded bg-white border border-slate-200 text-xs font-mono flex items-center justify-between shadow-2xs">
                  <span className="text-slate-800 truncate font-medium">{port}</span>
                  <span className="text-[10px] text-blue-700 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                    {port.startsWith('P_') ? 'PPort' : 'RPort'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interfaces & Signal Bus Mapping Table */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Extracted Interface Candidates & Signal Elements
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Sender-Receiver / Client-Server
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Interface Name</th>
                <th className="p-3">Kind</th>
                <th className="p-3">Provider Component</th>
                <th className="p-3">Consumer Components</th>
                <th className="p-3">Signals / Data Elements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interfaces.map((iface, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="p-3 text-blue-600 font-bold">{iface.name}</td>
                  <td className="p-3 text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px]">
                      {iface.kind}
                    </span>
                  </td>
                  <td className="p-3 text-slate-900 font-medium">{iface.provider}</td>
                  <td className="p-3 text-slate-700">{iface.consumers.join(', ')}</td>
                  <td className="p-3 text-slate-600 text-[11px] font-sans">
                    {iface.dataElements.join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
