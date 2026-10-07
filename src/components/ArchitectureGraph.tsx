import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { SoftwareComponent, PortInterface } from '../types/autosar';

interface ArchitectureGraphProps {
  components: SoftwareComponent[];
  interfaces: PortInterface[];
}

export const ArchitectureGraph: React.FC<ArchitectureGraphProps> = ({ components, interfaces }) => {
  const [selectedComponent, setSelectedComponent] = useState<SoftwareComponent>(components[0]);

  return (
    <div className="space-y-6">
      {/* Topology Selector */}
      <div className="p-6 rounded-xl bg-white border border-blue-100/90 shadow-2xs space-y-5">
        <div>
          <h3 className="text-sm font-bold text-blue-950 tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Virtual Functional Bus (VFB) Topology</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a software component to view port bindings and interface allocations
          </p>
        </div>

        {/* Component Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {components.map((comp) => {
            const isSelected = selectedComponent.name === comp.name;
            return (
              <button
                key={comp.name}
                onClick={() => setSelectedComponent(comp)}
                className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                    : 'bg-blue-50/30 border-blue-100/90 hover:border-blue-300 hover:bg-blue-50/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold ${
                    isSelected
                      ? 'text-blue-100'
                      : comp.asil === 'ASIL-D'
                      ? 'text-blue-900 bg-blue-100/80 px-1.5 py-0.5 rounded'
                      : comp.asil === 'ASIL-B'
                      ? 'text-blue-700 bg-blue-100/50 px-1.5 py-0.5 rounded'
                      : 'text-slate-500'
                  }`}>
                    {comp.asil}
                  </span>
                  <span className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    {comp.periodicity}
                  </span>
                </div>

                <div className={`font-bold text-xs truncate ${isSelected ? 'text-white' : 'text-blue-950'}`} title={comp.name}>
                  {comp.name}
                </div>
                <div className={`text-[11px] mt-0.5 truncate ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {comp.type}
                </div>

                <div className={`mt-3 pt-2.5 border-t flex items-center justify-between text-[11px] ${
                  isSelected ? 'border-blue-500 text-blue-100' : 'border-blue-100 text-slate-500'
                }`}>
                  <span>{comp.ports.length} Ports</span>
                  <span className={isSelected ? 'text-white font-semibold' : 'text-blue-900 font-semibold'}>{comp.ecu}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Component Details */}
        <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="space-y-1.5">
            <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
              Selected Component
            </span>
            <div className="text-sm font-bold text-blue-950">{selectedComponent.name}</div>
            <div className="text-slate-600">ECU: <span className="font-semibold text-blue-900">{selectedComponent.ecu}</span></div>
            <div className="text-slate-600">Rate: <span className="font-semibold text-blue-900">{selectedComponent.periodicity}</span></div>
            <div className="text-slate-600">ASIL: <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">{selectedComponent.asil}</span></div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider">
              Bound Ports ({selectedComponent.ports.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectedComponent.ports.map((port, pIdx) => (
                <div key={pIdx} className="p-2.5 rounded-lg bg-white border border-blue-100 flex items-center justify-between text-xs">
                  <span className="text-blue-950 font-semibold truncate">{port}</span>
                  <span className="text-[10px] text-blue-600 font-bold shrink-0 ml-2 bg-blue-50 px-1.5 py-0.5 rounded">
                    {port.startsWith('P_') ? 'PPort' : port.startsWith('R_') ? 'RPort' : 'PRPort'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Interfaces & Signal Table */}
      <div className="p-6 rounded-xl bg-white border border-blue-100/90 shadow-2xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-blue-950 tracking-tight">
            Interface Contracts & Signal Elements
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Sender-Receiver and Client-Server bindings between software components
          </p>
        </div>

        <div className="overflow-x-auto border border-blue-100 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-blue-50/60 text-blue-950 border-b border-blue-100 font-bold">
              <tr>
                <th className="p-3">Interface</th>
                <th className="p-3">Type</th>
                <th className="p-3">Provider</th>
                <th className="p-3">Consumers</th>
                <th className="p-3">Data Elements</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50/60">
              {interfaces.map((iface, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-3 text-blue-600 font-bold">{iface.name}</td>
                  <td className="p-3 text-slate-600 text-[11px] font-medium">{iface.kind}</td>
                  <td className="p-3 text-blue-950 font-semibold">{iface.provider}</td>
                  <td className="p-3 text-slate-600">{iface.consumers.join(', ')}</td>
                  <td className="p-3 text-blue-800 text-[11px] font-mono">
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
