import { DocumentItem, QueryRecord, PipelineComponentStatus } from '../types/autosar';

// Support VITE_BACKEND_URL with fallback to http://localhost:8000
const rawBackendUrl = import.meta.env.VITE_BACKEND_URL;
export const API_BASE_URL = (rawBackendUrl && rawBackendUrl.trim() !== '')
  ? rawBackendUrl.replace(/\/+$/, '')
  : 'http://localhost:8000';

/**
 * Format any network or API error into a clear, actionable message.
 */
export function formatBackendErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError') || e.message.includes('ECONNREFUSED')) {
      return `Cannot connect to FastAPI backend at ${API_BASE_URL}. Ensure the backend is running with 'uvicorn app.main:app --port 8000'.`;
    }
    return e.message;
  }
  return `An unknown error occurred while communicating with the backend at ${API_BASE_URL}.`;
}

/**
 * 1. Health check endpoint (GET /health)
 */
export async function getHealth(): Promise<{
  status: string;
  database?: string;
  vector_store?: string;
  embedding_model?: string;
  embedding_is_real_bge?: boolean;
  embedding_engine?: string;
  embedding_warning?: string | null;
  llm_provider?: string;
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) {
      throw new Error(`Health check returned status ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}

/**
 * 2. Get all ingested documents (GET /documents)
 */
export async function getDocuments(): Promise<DocumentItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/documents`);
    if (!res.ok) {
      throw new Error(`Failed to load documents (${res.status} ${res.statusText})`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}

/**
 * 3. Get single document details (GET /documents/{document_id})
 */
export async function getDocument(documentId: string): Promise<DocumentItem | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to load document (${res.status} ${res.statusText})`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}

/**
 * 4. Upload AUTOSAR HLD document (POST /documents/upload)
 */
export async function uploadDocument(
  file: File,
  ecuDomain: string = 'Central Zonal Gateway',
  standard: string = 'AUTOSAR Classic 4.4'
): Promise<DocumentItem> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ecu_domain', ecuDomain);
    formData.append('standard', standard);

    const res = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errDetail = `${res.status} ${res.statusText}`;
      try {
        const errJson = await res.json();
        errDetail = errJson.message || errJson.detail || errJson.error || errDetail;
      } catch {
        // ignore JSON parse failure
      }
      throw new Error(`Upload rejected: ${errDetail}`);
    }

    return await res.json();
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}

/**
 * 5. Delete document (DELETE /documents/{document_id})
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      throw new Error(`Failed to delete document (${res.status} ${res.statusText})`);
    }
    return true;
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}

/**
 * 6. Query HLD RAG Assistant (POST /chat/query)
 */
export async function queryHLD(params: {
  question: string;
  document_id?: string;
  top_k?: number;
}): Promise<QueryRecord> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: params.question,
        document_id: params.document_id || null,
        top_k: params.top_k || 5,
        include_trace: true,
      }),
    });

    if (!res.ok) {
      let errDetail = `${res.status} ${res.statusText}`;
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || errJson.message || errDetail;
      } catch {
        // ignore
      }
      throw new Error(`Query failed: ${errDetail}`);
    }

    return await res.json();
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}

/**
 * 7. Retrieve query history (GET /chat/history)
 */
export async function getHistory(limit: number = 50): Promise<QueryRecord[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/chat/history?limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Failed to load query history (${res.status} ${res.statusText})`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}

/**
 * 8. System Status (GET /health, /documents, /chat/history)
 */
export async function getSystemStatus(): Promise<{
  components: PipelineComponentStatus[];
  stats: {
    documentsCount: number;
    totalChunks: number;
    queriesCount: number;
    uptime: string;
  };
}> {
  // Query real FastAPI backend status
  const [healthRes, docsRes, histRes] = await Promise.allSettled([
    getHealth(),
    getDocuments(),
    getHistory(),
  ]);

  const isHealthy = healthRes.status === 'fulfilled';
  const healthData = isHealthy ? healthRes.value : null;

  const docs = docsRes.status === 'fulfilled' ? docsRes.value : [];
  const hist = histRes.status === 'fulfilled' ? histRes.value : [];

  const totalChunks = docs.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  const components: PipelineComponentStatus[] = [
    {
      name: "FastAPI REST API",
      category: "API",
      status: isHealthy ? "OPERATIONAL" : "OFFLINE",
      version: "1.0.0",
      latency_ms: isHealthy ? 6 : 0,
      target: `${API_BASE_URL} (FastAPI Server)`
    },
    {
      name: "Document Ingestion Engine",
      category: "STORAGE",
      status: isHealthy ? "OPERATIONAL" : "OFFLINE",
      version: "PyMuPDF / Native Parser",
      latency_ms: 12,
      target: "Page-Preserving PDF Parser"
    },
    {
      name: "Dense Embeddings (BGE)",
      category: "EMBEDDING",
      status: isHealthy
        ? (healthData?.embedding_is_real_bge ? "OPERATIONAL" : "DEGRADED")
        : "OFFLINE",
      version: healthData?.embedding_engine || "BAAI/bge-small-en-v1.5",
      latency_ms: 28,
      target: healthData?.embedding_warning
        ? healthData.embedding_warning
        : "384 Dense Dimensions"
    },
    {
      name: "Vector Store",
      category: "STORAGE",
      status: isHealthy ? "OPERATIONAL" : "OFFLINE",
      version: healthData?.vector_store || "ChromaDB",
      latency_ms: 10,
      target: "./vector_store/chroma"
    },
    {
      name: "LLM Orchestrator Service",
      category: "LLM",
      status: isHealthy ? "OPERATIONAL" : "OFFLINE",
      version: healthData?.llm_provider || "Grounded Engine",
      latency_ms: 180,
      target: "Zero-Hallucination Evidence Guard"
    },
    {
      name: "SQLite Metadata Store",
      category: "STORAGE",
      status: isHealthy ? "OPERATIONAL" : "OFFLINE",
      version: healthData?.database || "SQLite 3",
      latency_ms: 2,
      target: "./data/autosar_assistant.db"
    }
  ];

  return {
    components,
    stats: {
      documentsCount: docs.length,
      totalChunks,
      queriesCount: hist.length,
      uptime: isHealthy ? "Operational" : "Unavailable (Backend Disconnected)"
    }
  };
}

/**
 * 9. Architecture Analysis Candidates (GET /analysis/candidates)
 */
export async function getArchitectureCandidates(documentId?: string): Promise<{
  components: Array<{ name: string; type: string; asil: string; ecu: string; periodicity: string }>;
  interfaces: Array<{ name: string; kind: string; provider: string; consumers: string[]; elements: string }>;
  bus_matrix: Array<{ channel: string; bitrate_nominal: string; bitrate_data: string; payload: string; ecu: string }>;
}> {
  try {
    const url = documentId
      ? `${API_BASE_URL}/analysis/candidates?document_id=${encodeURIComponent(documentId)}`
      : `${API_BASE_URL}/analysis/candidates`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load architecture candidates (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}

/**
 * 10. Run Evaluation Benchmark (POST /evaluate/run)
 */
export async function runEvaluation(): Promise<any> {
  try {
    const res = await fetch(`${API_BASE_URL}/evaluate/run`, {
      method: 'POST',
    });
    if (!res.ok) {
      throw new Error(`Evaluation benchmark failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    throw new Error(formatBackendErrorMessage(err));
  }
}
