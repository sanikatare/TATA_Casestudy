/**
 * Unified Server-side Domain Types for AUTOSAR HLD Document Analysis
 */

export interface SourceEvidence {
  page_number: number;
  section: string;
  snippet: string;
}

export interface SoftwareComponent {
  name: string;
  component_type: string;
  asil_level: 'ASIL-D' | 'ASIL-C' | 'ASIL-B' | 'ASIL-A' | 'QM' | 'UNKNOWN';
  ecu_allocation: string;
  periodicity: string;
  memory_partition?: string;
  ports: string[];
  description?: string;
  source_evidence?: SourceEvidence;
}

export interface PortInterface {
  name: string;
  interface_type: 'Sender-Receiver' | 'Client-Server' | 'Parameter';
  data_elements: string[];
  provider_component: string;
  consumer_components: string[];
  communication_pattern?: string;
  source_evidence?: SourceEvidence;
}

export interface BusChannel {
  channel_name: string;
  bus_type: string;
  baud_rate_nominal: string;
  baud_rate_data: string;
  payload_bytes: number;
  transceiver_termination?: string;
  mapped_components: string[];
  source_evidence?: SourceEvidence;
}

export interface ArchitectureModel {
  document_id: string;
  document_name: string;
  extracted_at: string;
  components: SoftwareComponent[];
  interfaces: PortInterface[];
  bus_matrix: BusChannel[];
}

export interface ArchitectureFinding {
  id: string;
  rule_id: string;
  severity: 'HIGH' | 'MEDIUM' | 'INFO';
  category: 'Structural' | 'Completeness' | 'Safety & Decomposition' | 'Timing & Execution' | 'Interface & Data';
  title: string;
  description: string;
  entity_affected: string;
  source_evidence: SourceEvidence;
  suggested_action: string;
  validation_status: 'CONFIRMED' | 'POTENTIAL' | 'UNVERIFIED';
  review_status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EDITED';
  review_comments?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface DocumentItem {
  id: string;
  filename: string;
  version: string;
  file_size_bytes: number;
  page_count: number;
  chunk_count: number;
  empty_pages: number;
  processing_status: 'INDEXED' | 'PROCESSING' | 'PENDING' | 'FAILED';
  uploaded_at: string;
  ecu_domain?: string;
  standard?: string;
  raw_text?: string;
}

export interface DocumentPage {
  page_number: number;
  text: string;
}

export interface AutosarChunk {
  chunk_id: string;
  document_id: string;
  document_name: string;
  page_number: number;
  section: string;
  text: string;
  token_count: number;
  keywords: string[];
}

export interface Citation {
  document: string;
  document_id?: string;
  page: number;
  section: string;
  chunk_id: string;
  snippet: string;
  relevance: number;
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
