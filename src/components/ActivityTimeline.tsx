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
    title: 'Query Answered',
    description: 'CAN-FD routing query cited from ECU_Central_Gateway_HLD_v2.4.pdf.',
    timestamp: '10m ago',
    document_name: 'ECU_Central_Gateway_HLD_v2.4.pdf'
  },
  {
    id: 'e-2',
    type: 'INDEX',
    title: 'Document Indexed',
    description: '142 chunks persisted to vector collection.',
    timestamp: '1h ago',
    document_name: 'ECU_Central_Gateway_HLD_v2.4.pdf'
  },
  {
    id: 'e-3',
    type: 'EMBED',
    title: 'Embeddings Generated',
    description: '384-dimensional vectors calculated for Powertrain specification.',
    timestamp: '3h ago',
    document_name: 'Powertrain_Coordination_SWC_Specification.pdf'
  },
  {
    id: 'e-4',
    type: 'EXTRACT',
    title: 'PDF Extracted',
    description: '88 pages extracted preserving section hierarchy.',
    timestamp: '3h ago',
    document_name: 'Powertrain_Coordination_SWC_Specification.pdf'
  },
  {
    id: 'e-5',
    type: 'UPLOAD',
    title: 'Document Uploaded',
    description: 'Body_Domain_Controller_AUTOSAR_Adaptive.pdf (6.1MB) received.',
    timestamp: '1d ago',
    document_name: 'Body_Domain_Controller_AUTOSAR_Adaptive.pdf'
  }
];

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events = DEFAULT_EVENTS }) => {
  const getIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'UPLOAD':
        return <Upload className="w-3.5 h-3.5 text-blue-600" />;
      case 'EXTRACT':
        return <FileText className="w-3.5 h-3.5 text-sky-600" />;
      case 'EMBED':
        return <Cpu className="w-3.5 h-3.5 text-blue-700" />;
      case 'INDEX':
        return <Database className="w-3.5 h-3.5 text-blue-600" />;
      case 'QUERY':
        return <HelpCircle className="w-3.5 h-3.5 text-blue-500" />;
      default:
        return <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-3.5">
      {events.map((evt, idx) => (
        <div key={evt.id} className="relative flex items-start gap-3 text-xs">
          {idx !== events.length - 1 && (
            <div className="absolute left-3 top-6 bottom-0 w-px bg-blue-100" />
          )}

          <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 z-10">
            {getIcon(evt.type)}
          </div>

          <div className="flex-1 space-y-0.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-blue-950">{evt.title}</span>
              <span className="text-[11px] text-slate-400 font-mono">{evt.timestamp}</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-normal">
              {evt.description}
            </p>
            {evt.document_name && (
              <div className="text-[11px] text-blue-600 font-medium pt-0.5 flex items-center gap-1">
                <span>{evt.document_name}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
