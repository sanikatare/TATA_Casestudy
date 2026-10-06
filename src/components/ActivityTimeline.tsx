import React from 'react';
import { Upload, FileText, Cpu, Database, HelpCircle, CheckCircle2 } from 'lucide-react';
import { ActivityEvent } from '../types/autosar';

interface ActivityTimelineProps {
  events?: ActivityEvent[];
}

const DEFAULT_EVENTS: ActivityEvent[] = [
  {
    id: 'e-1',
    type: 'QUERY',
    title: 'Question Answered with Verified Citations',
    description: 'CAN-FD routing query answered with citations from ECU_Central_Gateway_HLD_v2.4.pdf (Pages 19, 42).',
    timestamp: '10 mins ago',
    document_name: 'ECU_Central_Gateway_HLD_v2.4.pdf'
  },
  {
    id: 'e-2',
    type: 'INDEX',
    title: 'Document Indexed in ChromaDB',
    description: '142 chunks persisted to collection "autosar_hld_chunks" with BGE-small embeddings.',
    timestamp: '1 hour ago',
    document_name: 'ECU_Central_Gateway_HLD_v2.4.pdf'
  },
  {
    id: 'e-3',
    type: 'EMBED',
    title: 'Dense Embeddings Generated',
    description: 'Dense 384-dimensional vectors calculated for Powertrain_Coordination_SWC_Specification.pdf.',
    timestamp: '3 hours ago',
    document_name: 'Powertrain_Coordination_SWC_Specification.pdf'
  },
  {
    id: 'e-4',
    type: 'EXTRACT',
    title: 'PDF Structural Text & Page Boundaries Preserved',
    description: '88 pages extracted preserving block hierarchies and chapter headings.',
    timestamp: '3 hours ago',
    document_name: 'Powertrain_Coordination_SWC_Specification.pdf'
  },
  {
    id: 'e-5',
    type: 'UPLOAD',
    title: 'Specification Ingested',
    description: 'Body_Domain_Controller_AUTOSAR_Adaptive.pdf (6.1MB) received via API.',
    timestamp: '1 day ago',
    document_name: 'Body_Domain_Controller_AUTOSAR_Adaptive.pdf'
  }
];

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events = DEFAULT_EVENTS }) => {
  const getIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'UPLOAD':
        return <Upload className="w-4 h-4 text-blue-600" />;
      case 'EXTRACT':
        return <FileText className="w-4 h-4 text-sky-600" />;
      case 'EMBED':
        return <Cpu className="w-4 h-4 text-purple-600" />;
      case 'INDEX':
        return <Database className="w-4 h-4 text-emerald-600" />;
      case 'QUERY':
        return <HelpCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {events.map((evt, idx) => (
        <div key={evt.id} className="relative flex items-start gap-3.5 text-xs">
          {idx !== events.length - 1 && (
            <div className="absolute left-3.5 top-7 bottom-0 w-px bg-slate-200" />
          )}

          <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 z-10 shadow-2xs">
            {getIcon(evt.type)}
          </div>

          <div className="flex-1 pt-0.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900">{evt.title}</span>
              <span className="text-[11px] text-slate-400 font-medium">{evt.timestamp}</span>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed font-normal">
              {evt.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};
