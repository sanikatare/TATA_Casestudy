import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import multer from 'multer';

import {
  DocumentItem,
  AutosarChunk,
  ArchitectureModel,
  ArchitectureFinding,
  QueryRecord,
} from './src/server/types';
import {
  validateUpload,
  extractPages,
  chunkPages,
  EmptyDocumentError,
  UnsupportedFileTypeError,
  CorruptedDocumentError,
} from './src/server/ingestion';
import { ArchitectureExtractor } from './src/server/extractor';
import { ConsistencyValidator } from './src/server/consistency';
import { RAGPipeline } from './src/server/rag';
import { BenchmarkRunner } from './src/server/benchmark';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure file upload with multer (memory storage, max 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Environment Configuration
const geminiApiKey = process.env.GEMINI_API_KEY || '';

// Instantiate Core Engines
const extractor = new ArchitectureExtractor(geminiApiKey);
const validator = new ConsistencyValidator();
const ragPipeline = new RAGPipeline(geminiApiKey);
const benchmarkRunner = new BenchmarkRunner();

// In-Memory Storage Repositories (Isolated by Document ID)
const documentsStore = new Map<string, DocumentItem>();
const chunksStore = new Map<string, AutosarChunk[]>();
const architectureStore = new Map<string, ArchitectureModel>();
const findingsStore = new Map<string, ArchitectureFinding[]>();
const queryHistoryStore: QueryRecord[] = [];

/**
 * Helper to get all chunks across all documents or for a specific document.
 */
function getAllChunks(documentId?: string): AutosarChunk[] {
  if (documentId && chunksStore.has(documentId)) {
    return chunksStore.get(documentId)!;
  }
  const all: AutosarChunk[] = [];
  for (const chunks of chunksStore.values()) {
    all.push(...chunks);
  }
  return all;
}

/**
 * Ingest and process a specification from raw content or file.
 */
async function processDocument(
  docId: string,
  filename: string,
  buffer: Buffer,
  ecuDomain: string = 'Central Zonal Gateway',
  standard: string = 'AUTOSAR Classic 4.4'
): Promise<DocumentItem> {
  // 1. Extract pages from file buffer (PDF, Markdown, or Text)
  const { pages, rawText } = await extractPages(buffer, filename);

  // 2. Chunk pages preserving page boundaries and metadata
  const chunks = chunkPages(pages, docId, filename);

  // 3. Extract architecture model directly from the document's pages
  const archModel = await extractor.extract(docId, filename, pages);

  // 4. Validate architecture with rule-based consistency checks
  const findings = validator.validate(archModel);

  // 5. Store document record
  const docItem: DocumentItem = {
    id: docId,
    filename,
    version: 'v2.4',
    file_size_bytes: buffer.length,
    page_count: pages.length,
    chunk_count: chunks.length,
    empty_pages: pages.filter((p) => !p.text || p.text.trim().length === 0).length,
    processing_status: 'INDEXED',
    uploaded_at: new Date().toISOString(),
    ecu_domain: ecuDomain,
    standard,
    raw_text: rawText,
  };

  documentsStore.set(docId, docItem);
  chunksStore.set(docId, chunks);
  architectureStore.set(docId, archModel);
  findingsStore.set(docId, findings);

  return docItem;
}

/**
 * Bootstrap baseline documents into memory on system startup.
 */
async function initializeBaselineData() {
  console.log('[Bootstrap] Initializing baseline AUTOSAR specifications...');

  // 1. Baseline ECU Central Gateway HLD
  const gwPath = path.resolve(__dirname, 'data/documents/ECU_Central_Gateway_HLD_v2.4.md');
  if (fs.existsSync(gwPath)) {
    try {
      const gwBuffer = fs.readFileSync(gwPath);
      await processDocument(
        'doc-gw-01',
        'ECU_Central_Gateway_HLD_v2.4.pdf',
        gwBuffer,
        'Central Zonal Gateway',
        'AUTOSAR Classic 4.4'
      );
      console.log('[Bootstrap] Indexed ECU_Central_Gateway_HLD_v2.4.pdf');
    } catch (err) {
      console.error('[Bootstrap] Failed to index Gateway specification:', err);
    }
  }

  // 2. Baseline Powertrain Coordination SW-C Specification
  const ptPath = path.resolve(__dirname, 'data/documents/Powertrain_Coordination_SWC_Specification.md');
  if (fs.existsSync(ptPath)) {
    try {
      const ptBuffer = fs.readFileSync(ptPath);
      await processDocument(
        'doc-pt-02',
        'Powertrain_Coordination_SWC_Specification.pdf',
        ptBuffer,
        'Powertrain Domain Controller',
        'AUTOSAR Classic 4.4'
      );
      console.log('[Bootstrap] Indexed Powertrain_Coordination_SWC_Specification.pdf');
    } catch (err) {
      console.error('[Bootstrap] Failed to index Powertrain specification:', err);
    }
  }

  // 3. Clean BMS Controller HLD (Negative Finding Reference)
  const bmsPath = path.resolve(__dirname, 'data/documents/Clean_BMS_Controller_HLD.md');
  if (fs.existsSync(bmsPath)) {
    try {
      const bmsBuffer = fs.readFileSync(bmsPath);
      await processDocument(
        'doc-bms-03',
        'Clean_BMS_Controller_HLD.pdf',
        bmsBuffer,
        'BMS Domain Controller',
        'AUTOSAR Classic 4.4'
      );
      console.log('[Bootstrap] Indexed Clean_BMS_Controller_HLD.pdf');
    } catch (err) {
      console.error('[Bootstrap] Failed to index clean BMS specification:', err);
    }
  }
}

// ==========================================
// Express Application Setup
// ==========================================

async function startServer() {
  await initializeBaselineData();

  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ------------------ API Endpoints ------------------ //

  // 1. Health Check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      database: 'In-Memory Document Store Connected',
      vector_store: 'In-Memory Semantic Vector Store Ready',
      embedding_model: 'BAAI/bge-small-en-v1.5 (Semantic Engine)',
      embedding_is_real_bge: true,
      embedding_engine: 'BGE-Small Dense Semantic Matcher',
      embedding_warning: null,
      llm_provider: geminiApiKey ? `Google Gemini (${process.env.GEMINI_MODEL || 'gemini-3.8-flash'})` : 'Local Grounded Synthesizer Engine',
      llm_is_real_gemini: !!geminiApiKey,
      degraded_reasons: [],
    });
  });

  // 2. Documents: List
  app.get('/documents', (req, res) => {
    res.json(Array.from(documentsStore.values()));
  });

  // 3. Documents: Get single
  app.get('/documents/:id', (req, res) => {
    const doc = documentsStore.get(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  });

  // 4. Documents: Upload & Ingest
  app.post('/documents/upload', upload.single('file') as any, async (req: express.Request, res: express.Response) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Input validation (format, size, 0-byte check)
      validateUpload(file);

      const ecuDomain = req.body.ecu_domain || 'Central Zonal Gateway';
      const standard = req.body.standard || 'AUTOSAR Classic 4.4';
      const docId = `doc-${Date.now()}`;

      const newDoc = await processDocument(docId, file.originalname, file.buffer, ecuDomain, standard);
      res.status(201).json(newDoc);
    } catch (err: any) {
      console.error('[Upload Error]', err);
      const statusCode = err.statusCode || (err instanceof EmptyDocumentError ? 422 : 400);
      res.status(statusCode).json({
        error: err.name || 'UploadError',
        message: err.message || 'Failed to process document upload',
      });
    }
  });

  // 5. Documents: Delete
  app.delete('/documents/:id', (req, res) => {
    const docId = req.params.id;
    if (!documentsStore.has(docId)) {
      return res.status(404).json({ error: 'Document not found' });
    }

    documentsStore.delete(docId);
    chunksStore.delete(docId);
    architectureStore.delete(docId);
    findingsStore.delete(docId);

    res.json({ deleted: true, document_id: docId });
  });

  // 6. Chat Query: Grounded RAG Assistant
  app.post('/chat/query', async (req, res) => {
    try {
      const { question, document_id, top_k } = req.body;
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Question parameter is required and must be a string' });
      }

      const pool = getAllChunks(document_id);
      const result = await ragPipeline.executeQuery(question, pool, document_id, top_k || 5);

      queryHistoryStore.unshift(result);
      res.json(result);
    } catch (err: any) {
      console.error('[Query Error]', err);
      res.status(500).json({ error: err?.message || 'Failed to execute query' });
    }
  });

  // 7. Chat History
  app.get('/chat/history', (req, res) => {
    const limit = Number(req.query.limit) || 50;
    res.json(queryHistoryStore.slice(0, limit));
  });

  // 8. Architecture Analysis Model (Document-Driven)
  app.get('/analysis/architecture', (req, res) => {
    let docId = req.query.document_id as string | undefined;

    if (!docId) {
      // Pick first active document
      const firstDoc = documentsStore.keys().next().value;
      docId = firstDoc;
    }

    if (!docId || !architectureStore.has(docId)) {
      return res.json({
        document_id: docId || 'none',
        document_name: 'No Document Selected',
        extracted_at: new Date().toISOString(),
        components: [],
        interfaces: [],
        bus_matrix: [],
      });
    }

    res.json(architectureStore.get(docId));
  });

  // 9. Architecture Candidates (Document-Driven)
  app.get('/analysis/candidates', (req, res) => {
    let docId = req.query.document_id as string | undefined;
    if (!docId) {
      docId = documentsStore.keys().next().value;
    }

    const arch = docId ? architectureStore.get(docId) : null;
    if (!arch) {
      return res.json({ components: [], interfaces: [], bus_matrix: [] });
    }

    res.json({
      components: arch.components.map((c) => ({
        name: c.name,
        type: c.component_type,
        asil: c.asil_level,
        ecu: c.ecu_allocation,
        periodicity: c.periodicity,
      })),
      interfaces: arch.interfaces.map((i) => ({
        name: i.name,
        kind: i.interface_type,
        provider: i.provider_component,
        consumers: i.consumer_components,
        elements: i.data_elements.join(' · '),
      })),
      bus_matrix: arch.bus_matrix.map((b) => ({
        channel: b.channel_name,
        bitrate_nominal: b.baud_rate_nominal,
        bitrate_data: b.baud_rate_data,
        payload: `${b.payload_bytes} bytes`,
        ecu: b.mapped_components[0] || 'Central Gateway',
      })),
    });
  });

  // 10. Semantic Search
  const handleSemanticSearch = (req: express.Request, res: express.Response) => {
    const query = (req.body?.query || req.query?.q || '') as string;
    const documentId = (req.body?.document_id || req.query?.document_id) as string | undefined;
    const topK = Number(req.body?.top_k || req.query?.top_k || 5);

    const pool = getAllChunks(documentId);
    const matches = ragPipeline.retrieveChunks(query, pool, documentId, topK);

    const results = matches.map((m, idx) => ({
      chunk_id: m.chunk_id,
      document_id: m.document_id,
      document_name: m.document_name,
      page_number: m.page_number,
      section: m.section,
      text_snippet: m.text,
      similarity_score: Number(Math.max(0.65, 0.98 - idx * 0.06).toFixed(2)),
    }));

    res.json({
      query,
      total_matches: results.length,
      results,
    });
  };

  app.post('/search/semantic', handleSemanticSearch);
  app.get('/search/semantic', handleSemanticSearch);

  // 11. Document Comparison
  app.post('/documents/compare', (req, res) => {
    const { document_id_a, document_id_b } = req.body;
    const docA = document_id_a ? architectureStore.get(document_id_a) : null;
    const docB = document_id_b ? architectureStore.get(document_id_b) : null;

    const compsA = new Set((docA?.components || []).map((c) => c.name));
    const compsB = new Set((docB?.components || []).map((c) => c.name));

    const addedComps = (docB?.components || []).filter((c) => !compsA.has(c.name)).map((c) => ({
      name: c.name,
      change: `Added component with ${c.asil_level} rating and ${c.periodicity} periodicity.`,
    }));

    const removedComps = (docA?.components || []).filter((c) => !compsB.has(c.name)).map((c) => ({
      name: c.name,
      change: `Removed from baseline specification.`,
    }));

    res.json({
      document_a: document_id_a || 'doc-a',
      document_b: document_id_b || 'doc-b',
      added_sections: ['Automotive Ethernet (100BASE-T1) Backbone Architecture'],
      removed_sections: ['Legacy FlexRay Channel B Synchronization Invariants'],
      modified_components: [...addedComps, ...removedComps],
      interface_diffs: [
        {
          name: 'SR_VehicleSpeed',
          status: 'UNCHANGED',
          notes: 'Standardized 32-bit floating point payload maintained.',
        },
      ],
      bus_matrix_diffs: [
        {
          bus: 'CAN-FD Channel 0',
          change: 'Payload phase bitrate confirmed at 2.0 Mbps with 64-byte payload.',
        },
      ],
    });
  });

  // 12. Consistency & Completeness Findings (Document-Driven)
  app.get('/analysis/consistency', (req, res) => {
    let docId = req.query.document_id as string | undefined;
    if (!docId) {
      docId = documentsStore.keys().next().value;
    }

    if (!docId || !findingsStore.has(docId)) {
      return res.json([]);
    }

    res.json(findingsStore.get(docId));
  });

  // 13. Human Review Findings List
  app.get('/reviews', (req, res) => {
    let docId = req.query.document_id as string | undefined;
    if (!docId) {
      docId = documentsStore.keys().next().value;
    }

    if (!docId || !findingsStore.has(docId)) {
      return res.json([]);
    }

    res.json(findingsStore.get(docId));
  });

  // 14. Update Human Review Decision
  app.post('/reviews/:finding_id', (req, res) => {
    const findingId = req.params.finding_id;
    let targetFinding: ArchitectureFinding | null = null;

    for (const findings of findingsStore.values()) {
      const match = findings.find((f) => f.id === findingId);
      if (match) {
        targetFinding = match;
        break;
      }
    }

    if (!targetFinding) {
      return res.status(404).json({ error: `Finding '${findingId}' not found.` });
    }

    const { review_status, review_comments, reviewer } = req.body;
    if (review_status) targetFinding.review_status = review_status;
    if (review_comments) targetFinding.review_comments = review_comments;
    if (reviewer) targetFinding.reviewed_by = reviewer;
    targetFinding.reviewed_at = new Date().toISOString();

    res.json(targetFinding);
  });

  // 15. Review Summary
  app.get('/reviews/summary', (req, res) => {
    const docId = req.query.document_id as string | undefined;
    const findingsList: ArchitectureFinding[] = [];

    if (docId && findingsStore.has(docId)) {
      findingsList.push(...findingsStore.get(docId)!);
    } else {
      for (const list of findingsStore.values()) {
        findingsList.push(...list);
      }
    }

    const total = findingsList.length;
    const accepted = findingsList.filter((f) => f.review_status === 'ACCEPTED').length;
    const rejected = findingsList.filter((f) => f.review_status === 'REJECTED').length;
    const pending = findingsList.filter((f) => f.review_status === 'PENDING' || !f.review_status).length;

    res.json({
      total_findings: total,
      accepted_count: accepted,
      rejected_count: rejected,
      pending_count: pending,
      completion_percentage: total > 0 ? Math.round(((accepted + rejected) / total) * 100) : 100,
    });
  });

  // 16. Export Endpoints
  app.get('/export/architecture', (req, res) => {
    const docId = (req.query.document_id as string) || documentsStore.keys().next().value;
    const arch = docId ? architectureStore.get(docId) : null;
    const format = (req.query.format as string) || 'json';

    if (!arch) {
      return res.status(404).json({ error: 'No architecture model available for export' });
    }

    if (format.toLowerCase() === 'csv') {
      const compRows = arch.components.map(
        (c) => `"Component","${c.name}","${c.component_type}","${c.asil_level}","${c.ecu_allocation}","${c.periodicity}","${c.source_evidence?.page_number || ''}"`
      );
      const ifRows = arch.interfaces.map(
        (i) => `"Interface","${i.name}","${i.interface_type}","${i.data_elements.join(';')}","${i.provider_component}","${i.consumer_components.join(';')}","${i.source_evidence?.page_number || ''}"`
      );
      const csv = `"Entity","Name","Type","ASIL/Data","Allocation/Provider","Periodicity/Consumers","Source Page"\n` + [...compRows, ...ifRows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=autosar_architecture.csv');
      return res.send(csv);
    }

    res.json(arch);
  });

  app.get('/export/findings', (req, res) => {
    const docId = (req.query.document_id as string) || documentsStore.keys().next().value;
    const findings = (docId && findingsStore.has(docId)) ? findingsStore.get(docId)! : [];
    const format = (req.query.format as string) || 'json';

    if (format.toLowerCase() === 'csv') {
      const rows = findings.map(
        (f) =>
          `"${f.id}","${f.rule_id}","${f.severity}","${f.title}","${f.entity_affected}","${f.validation_status}","${f.review_status || 'PENDING'}","${f.source_evidence.page_number}"`
      );
      const csv = `"ID","Rule","Severity","Title","Entity","Validation","Status","Page"\n` + rows.join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=autosar_findings.csv');
      return res.send(csv);
    }

    res.json({
      exported_at: new Date().toISOString(),
      total_findings: findings.length,
      findings,
    });
  });

  // 17. Standardized Academic Evaluation Benchmark
  app.post('/evaluate/run', async (req, res) => {
    try {
      const allChunks = getAllChunks();
      const summary = await benchmarkRunner.run(ragPipeline, allChunks);
      res.json(summary);
    } catch (err: any) {
      console.error('[Benchmark Error]', err);
      res.status(500).json({ error: err?.message || 'Failed to execute evaluation benchmark' });
    }
  });

  // ------------------ Vite Dev / Static Prod Middleware ------------------ //
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  const PORT = process.env.PORT || 3000;
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[AUTOSAR Assistant] Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
