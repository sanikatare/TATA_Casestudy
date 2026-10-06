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
        return <Server className="w-5 h-5 text-sky-600" />;
      case 'STORAGE':
        return <Database className="w-5 h-5 text-blue-600" />;
      case 'EMBEDDING':
        return <Cpu className="w-5 h-5 text-purple-600" />;
      case 'LLM':
        return <Radio className="w-5 h-5 text-blue-700" />;
      case 'ORCHESTRATOR':
        return <Layers className="w-5 h-5 text-emerald-600" />;
      default:
        return <HardDrive className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 transition-all shadow-xs hover:shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
            {getIcon(component.category)}
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-900 tracking-tight">
              {component.name}
            </h4>
            <div className="text-xs text-slate-500 mt-0.5">
              {component.category} · {component.version || 'Active'}
            </div>
          </div>
        </div>

        <StatusBadge status={component.status} />
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Target: <span className="text-slate-800 font-bold">{component.target || 'Local'}</span></span>
        {component.latency_ms !== undefined && (
          <span className="text-emerald-700 font-extrabold">{component.latency_ms}ms latency</span>
        )}
      </div>
    </div>
  );
};
