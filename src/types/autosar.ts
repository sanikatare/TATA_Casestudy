export interface DocumentItem {
  id: string;
  filename: string;
  version?: string;
  file_size_bytes: number;
  page_count: number;
  chunk_count: number;
  processing_status: 'INDEXED' | 'PROCESSING' | 'PENDING' | 'FAILED';
  uploaded_at?: string;
  ecu_domain?: string;
  standard?: string;
}

export interface Citation {
  document: string;
  document_id?: string;
  page: number;
  section: string;
  chunk_id: string;
  snippet: string;
  relevance: number; // 0.0 to 1.0
}

export interface SoftwareComponent {
  name: string;
  type: string;
  ecu: string;
  asil: 'ASIL-D' | 'ASIL-C' | 'ASIL-B' | 'ASIL-A' | 'QM';
  periodicity: string;
  ports: string[];
}

export interface PortInterface {
  name: string;
  kind: 'Sender-Receiver' | 'Client-Server' | 'Parameter';
  provider: string;
  consumers: string[];
  dataElements: string[];
}

export interface QueryRecord {
  id: string;
  question: string;
  answer: string;
  document_id?: string;
  document_name: string;
  timestamp: string;
  status: 'SUCCESS' | 'NO_GROUNDING' | 'ABSTAINED' | 'FAILED';
  confidence_score: number;
  citations: Citation[];
}

export interface PipelineComponentStatus {
  name: string;
  category: 'API' | 'STORAGE' | 'EMBEDDING' | 'LLM' | 'ORCHESTRATOR';
  status: 'OPERATIONAL' | 'DEGRADED' | 'OFFLINE';
  version?: string;
  latency_ms?: number;
  target?: string;
}

export interface ActivityEvent {
  id: string;
  type: 'UPLOAD' | 'EXTRACT' | 'EMBED' | 'INDEX' | 'QUERY';
  title: string;
  description: string;
  timestamp: string;
  document_name?: string;
}
