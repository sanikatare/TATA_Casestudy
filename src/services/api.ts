import { DocumentItem, QueryRecord, PipelineComponentStatus } from '../types/autosar';

const configuredBackendUrl = import.meta.env.VITE_BACKEND_URL?.trim();
const API_BASE_URL = (configuredBackendUrl && configuredBackendUrl.length > 0
  ? configuredBackendUrl
  : 'http://localhost:8000'
).replace(/\/+$/, '');

class BackendApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'BackendApiError';
    this.status = status;
  }
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  timeoutMs: number = 10000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const errorMessage =
        errorPayload?.detail ||
        errorPayload?.message ||
        `Backend request failed with status ${response.status}`;
      throw new BackendApiError(errorMessage, response.status);
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof BackendApiError) {
      throw error;
    }
    if (error?.name === 'AbortError') {
      throw new BackendApiError(
        `Backend request timed out. Ensure FastAPI is running at ${API_BASE_URL}.`
      );
    }
    throw new BackendApiError(
      `Unable to reach backend at ${API_BASE_URL}. Ensure FastAPI is running and VITE_BACKEND_URL is correct.`
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function getHealth(): Promise<{
  status: string;
  database: string;
  vector_store: string;
  embedding_model: string;
  embedding_model_loaded?: boolean;
  embedding_model_error?: string | null;
  llm_provider: string;
}> {
  return requestJson('/health', undefined, 3000);
}

export async function getDocuments(): Promise<DocumentItem[]> {
  return requestJson('/documents');
}

export async function getDocument(documentId: string): Promise<DocumentItem | null> {
  return requestJson(`/documents/${documentId}`);
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);
  return requestJson('/documents/upload', { method: 'POST', body: formData }, 120000);
}

export async function deleteDocument(documentId: string): Promise<boolean> {
  await requestJson(`/documents/${documentId}`, { method: 'DELETE' });
  return true;
}

export async function queryHLD(params: {
  question: string;
  document_id?: string;
  top_k?: number;
}): Promise<QueryRecord> {
  return requestJson('/chat/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  }, 45000);
}

export async function getHistory(): Promise<QueryRecord[]> {
  return requestJson('/chat/history');
}

export async function getSystemStatus(): Promise<{
  components: PipelineComponentStatus[];
  stats: {
    documentsCount: number;
    totalChunks: number;
    queriesCount: number;
    uptime: string;
  };
}> {
  const [health, docs, history] = await Promise.all([
    getHealth(),
    getDocuments(),
    getHistory()
  ]);

  const apiStatus = health.status?.toLowerCase() === 'healthy' ? 'OPERATIONAL' : 'DEGRADED';
  const embeddingStatus = health.embedding_model_loaded ? 'OPERATIONAL' : 'DEGRADED';

  return {
    components: [
      {
        name: 'FastAPI REST API',
        category: 'API',
        status: apiStatus,
        version: '1.0.0',
        target: API_BASE_URL
      },
      {
        name: 'SQLite Metadata Store',
        category: 'STORAGE',
        status: 'OPERATIONAL',
        target: health.database
      },
      {
        name: 'ChromaDB Vector Store',
        category: 'STORAGE',
        status: 'OPERATIONAL',
        target: health.vector_store
      },
      {
        name: `Embedding Model (${health.embedding_model})`,
        category: 'EMBEDDING',
        status: embeddingStatus,
        target: health.embedding_model_error || 'Loaded'
      },
      {
        name: 'LLM Provider',
        category: 'LLM',
        status: 'OPERATIONAL',
        target: health.llm_provider
      }
    ],
    stats: {
      documentsCount: docs.length,
      totalChunks: docs.reduce((acc, d) => acc + d.chunk_count, 0),
      queriesCount: history.length,
      uptime: health.status?.toLowerCase() === 'healthy' ? 'Healthy' : 'Degraded'
    }
  };
}

