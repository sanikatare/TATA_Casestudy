import React from 'react';
import { Server, Database, Cpu, Radio, Layers, HardDrive } from 'lucide-react';
import { PipelineComponentStatus } from '../types/autosar';
import { StatusBadge } from './StatusBadge';

interface SystemStatusCardProps {
  component: PipelineComponentStatus;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ component }) => {
  const getIcon = (cat: PipelineComponentStatus['category']) => {
    switch (cat) {
      case 'API':
        return <Server className="w-4 h-4 text-sky-600" />;
      case 'STORAGE':
        return <Database className="w-4 h-4 text-blue-600" />;
      case 'EMBEDDING':
        return <Cpu className="w-4 h-4 text-blue-700" />;
      case 'LLM':
        return <Radio className="w-4 h-4 text-blue-800" />;
      case 'ORCHESTRATOR':
        return <Layers className="w-4 h-4 text-sky-600" />;
      default:
        return <HardDrive className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="p-4 rounded-xl bg-white border border-blue-100 hover:border-blue-300 transition-all shadow-2xs space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100">
            {getIcon(component.category)}
          </div>
          <div>
            <h4 className="font-bold text-xs text-blue-950 tracking-tight">
              {component.name}
            </h4>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {component.category} · {component.version || 'Active'}
            </div>
          </div>
        </div>

        <StatusBadge status={component.status} size="sm" />
      </div>

      <div className="pt-2.5 border-t border-blue-50 flex items-center justify-between text-xs text-slate-500 font-normal">
        <span>Target: <span className="text-blue-950 font-semibold">{component.target || 'Local'}</span></span>
        {component.latency_ms !== undefined && (
          <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded">{component.latency_ms}ms latency</span>
        )}
      </div>
    </div>
  );
};
