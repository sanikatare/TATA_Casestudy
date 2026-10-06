import React, { useState } from 'react';
import { Layers, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import { SoftwareComponent, PortInterface } from '../types/autosar';

interface ArchitectureGraphProps {
  components: SoftwareComponent[];
  interfaces: PortInterface[];
}

export const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({ components, interfaces }) => {
  const [selectedComponent, setSelectedComponent] = useState<SoftwareComponent>(components[0]);

  return (
    <div className="space-y-7">
      {/* Notice on AI-Extracted Candidate status */}
      <div className="p-5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-950 flex items-start gap-4 shadow-2xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <div className="font-bold text-amber-950 text-sm">
            AI-Extracted Candidate Architecture Notice
          </div>
          <p className="text-xs leading-relaxed text-amber-900 font-normal">
            The software components, interfaces, and port bindings below are extracted automatically by semantic parsing and RAG entity recognition from the ingested AUTOSAR High-Level Design document. This output represents <strong>AI-extracted candidates</strong> and does not constitute formally certified OEM safety release artifacts under ISO 26262.
          </p>
        </div>
      </div>

      {/* Interactive ECU Architecture Topology Visualizer */}
      <div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-blue-600" />
              <span>AUTOSAR Virtual Functional Bus (VFB) Architecture Map</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select an architectural component block to inspect interface allocations, ASIL decomposition, and port bindings.
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 self-start sm:self-auto">
            Interactive Topology
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
                className={`p-5 rounded-2xl border text-left transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md transform -translate-y-0.5'
                    : 'bg-slate-50/90 border-slate-200/90 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    comp.asil === 'ASIL-D'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : comp.asil === 'ASIL-B'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-200 text-slate-800'
                  }`}>
                    {comp.asil}
                  </span>
                  <span className={`text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'} font-medium`}>
                    {comp.periodicity}
                  </span>
                </div>

                <div className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-slate-900'}`} title={comp.name}>
                  {comp.name}
                </div>
                <div className={`text-xs mt-1 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {comp.type}
                </div>

                <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs ${
                  isSelected ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-500'
                }`}>
                  <span>{comp.ports.length} Ports</span>
                  <span className={`font-bold ${isSelected ? 'text-blue-300' : 'text-blue-700'}`}>{comp.ecu}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Component Deep-Dive Inspector */}
        <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/90 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              Component Candidate Details
            </span>
            <div className="text-base font-extrabold text-slate-900 leading-snug">{selectedComponent.name}</div>
            <div className="text-xs text-slate-700">
              Allocated ECU Host: <strong className="text-slate-900">{selectedComponent.ecu}</strong>
            </div>
            <div className="text-xs text-slate-700">
              Execution Rate: <strong className="text-blue-700 font-bold">{selectedComponent.periodicity}</strong>
            </div>
            <div className="text-xs text-slate-700">
              Safety Classification: <strong className="text-rose-700 font-bold">{selectedComponent.asil}</strong>
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-bold">
              Bound AUTOSAR Ports (PPort / RPort)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {selectedComponent.ports.map((port, pIdx) => (
                <div key={pIdx} className="p-3 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between shadow-2xs">
                  <span className="text-slate-900 truncate font-bold">{port}</span>
                  <span className="text-[10px] font-bold text-blue-800 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                    {port.startsWith('P_') ? 'PPort (Provider)' : port.startsWith('R_') ? 'RPort (Receiver)' : 'PRPort'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interfaces & Signal Bus Mapping Table */}
      <div className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Extracted Interface Candidates & Signal Elements
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sender-Receiver and Client-Server communication contracts.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            AUTOSAR RTE Matrix
          </span>
        </div>

        <div className="overflow-x-auto border border-slate-200/90 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-slate-700 border-b border-slate-200/90 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="p-3.5">Interface Name</th>
                <th className="p-3.5">Pattern</th>
                <th className="p-3.5">Provider Component</th>
                <th className="p-3.5">Consumer Components</th>
                <th className="p-3.5">Data Elements / Methods</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {interfaces.map((iface, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="p-3.5 text-blue-700 font-bold">{iface.name}</td>
                  <td className="p-3.5 text-slate-800">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[10px] font-bold">
                      {iface.kind}
                    </span>
                  </td>
                  <td className="p-3.5 text-slate-900 font-bold">{iface.provider}</td>
                  <td className="p-3.5 text-slate-700">{iface.consumers.join(', ')}</td>
                  <td className="p-3.5 text-slate-600 text-xs">
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
