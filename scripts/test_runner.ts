import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  extractPages,
  extractFromText,
  chunkPages,
  validateUpload,
  EmptyDocumentError,
  UnsupportedFileTypeError,
} from '../src/server/ingestion';
import { ArchitectureExtractor } from '../src/server/extractor';
import { ConsistencyValidator } from '../src/server/consistency';
import { RAGPipeline } from '../src/server/rag';
import { BenchmarkRunner } from '../src/server/benchmark';
import { DocumentPage, AutosarChunk, ArchitectureModel } from '../src/server/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('AUTOSAR HLD Analysis Assistant - Automated Test Suite');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Ingestion, Validation & Parsing
  // --------------------------------------------------------------------------
  console.log('[1/6] Running Document Ingestion & Validation Tests...');

  // 1.1 Empty file rejection
  try {
    validateUpload({
      originalname: 'empty.pdf',
      size: 0,
      buffer: Buffer.from(''),
    });
    assert(false, 'Reject 0-byte uploaded file');
  } catch (err: any) {
    assert(err instanceof EmptyDocumentError, 'Reject 0-byte uploaded file with EmptyDocumentError');
  }

  // 1.2 Unsupported file format rejection
  try {
    validateUpload({
      originalname: 'binary.exe',
      size: 1024,
      buffer: Buffer.from('binary-data'),
    });
    assert(false, 'Reject unsupported .exe format');
  } catch (err: any) {
    assert(err instanceof UnsupportedFileTypeError, 'Reject unsupported .exe format with UnsupportedFileTypeError');
  }

  // 1.3 Text page extraction with section splitting
  const sampleMarkdown = `# Section 1: Overview\nText on page one.\n\n---\n\n# Section 2: Safety\nText on page two.`;
  const { pages: extractedPages } = extractFromText(sampleMarkdown);
  assert(extractedPages.length === 2, 'Extract distinct pages preserving page separators (---)', `Got ${extractedPages.length}`);
  assert(extractedPages[0].page_number === 1 && extractedPages[1].page_number === 2, 'Preserve 1-indexed page boundaries');

  // 1.4 Chunking preserving metadata
  const sampleChunks = chunkPages(extractedPages, 'test-doc-01', 'Sample_Spec.pdf');
  assert(sampleChunks.length >= 2, 'Generate semantic chunks from pages', `Got ${sampleChunks.length}`);
  assert(
    sampleChunks.every((c) => c.document_id === 'test-doc-01' && c.page_number > 0 && c.section.length > 0),
    'Preserve document_id, page_number, and section across all chunks'
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Document-Driven Architecture Extraction
  // --------------------------------------------------------------------------
  console.log('\n[2/6] Running Document-Driven Architecture Extraction Tests...');
  const extractor = new ArchitectureExtractor();

  // 2.1 Baseline Gateway Specification Extraction
  const gwPath = path.resolve(__dirname, '../data/documents/ECU_Central_Gateway_HLD_v2.4.md');
  const gwText = fs.readFileSync(gwPath, 'utf-8');
  const { pages: gwPages } = extractFromText(gwText);
  const gwModel = extractor.extractDeterministically('doc-gw', 'ECU_Central_Gateway_HLD_v2.4.pdf', gwPages);

  const gwCompNames = gwModel.components.map((c) => c.name);
  assert(gwCompNames.includes('PowertrainCoordination_SWC'), 'Extract PowertrainCoordination_SWC from Gateway HLD');
  assert(gwCompNames.includes('Gateway_Router_SWC'), 'Extract Gateway_Router_SWC from Gateway HLD');
  assert(gwCompNames.includes('Dem_BSW_Module'), 'Extract Dem_BSW_Module from Gateway HLD');

  // 2.2 Verify evidence preservation
  const ptComp = gwModel.components.find((c) => c.name === 'PowertrainCoordination_SWC');
  assert(
    ptComp?.source_evidence?.page_number !== undefined && ptComp.source_evidence.snippet.length > 0,
    'Preserve verifiable source page and snippet evidence on extracted component'
  );

  // 2.3 Interface extraction
  const ifNames = gwModel.interfaces.map((i) => i.name);
  assert(ifNames.includes('SR_TorqueRequest'), 'Extract SR_TorqueRequest interface from text');
  assert(ifNames.includes('SR_VehicleSpeed'), 'Extract SR_VehicleSpeed interface from text');
  assert(ifNames.includes('CS_DiagRoutine_Service'), 'Extract CS_DiagRoutine_Service client-server interface');

  // 2.4 Bus matrix extraction
  const busNames = gwModel.bus_matrix.map((b) => b.channel_name);
  assert(busNames.some((b) => b.includes('CAN-FD')), 'Extract CAN-FD bus channel configuration');

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Dynamic Multi-Document Extraction & Cross-Document Isolation
  // --------------------------------------------------------------------------
  console.log('\n[3/6] Running Multi-Document Isolation & Non-Inheritance Tests...');

  // 3.1 Extract distinct Clean BMS Specification
  const bmsPath = path.resolve(__dirname, '../data/documents/Clean_BMS_Controller_HLD.md');
  const bmsText = fs.readFileSync(bmsPath, 'utf-8');
  const { pages: bmsPages } = extractFromText(bmsText);
  const bmsModel = extractor.extractDeterministically('doc-bms', 'Clean_BMS_Controller_HLD.pdf', bmsPages);

  const bmsCompNames = bmsModel.components.map((c) => c.name);
  assert(bmsCompNames.includes('BMS_Master_SWC'), 'Extract BMS_Master_SWC from BMS specification');
  assert(!bmsCompNames.includes('PowertrainCoordination_SWC'), 'Regression: BMS model does NOT inherit PowertrainCoordination_SWC');
  assert(!bmsCompNames.includes('Gateway_Router_SWC'), 'Regression: BMS model does NOT inherit Gateway_Router_SWC');

  // 3.2 Empty Document Extraction produces zero entities
  const emptyPages: DocumentPage[] = [{ page_number: 1, text: 'This document describes general project background without components.' }];
  const emptyModel = extractor.extractDeterministically('doc-empty', 'Empty.pdf', emptyPages);
  assert(emptyModel.components.length === 0, 'Document without components produces 0 extracted components (no mock fallback)');
  assert(emptyModel.interfaces.length === 0, 'Document without interfaces produces 0 extracted interfaces');

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Real Rule-Based Architecture Consistency Engine
  // --------------------------------------------------------------------------
  console.log('\n[4/6] Running Consistency Engine & Rule Verification Tests...');
  const validator = new ConsistencyValidator();

  // 4.1 Gateway HLD validation
  const gwFindings = validator.validate(gwModel);
  assert(gwFindings.length > 0, 'Detect rule violations in unpartitioned Gateway HLD', `Found ${gwFindings.length} findings`);

  const hasAsilFfi = gwFindings.some((f) => f.rule_id === 'RULE-SAFETY-01-ASIL-FFI');
  assert(hasAsilFfi, 'Detect ISO 26262 Freedom-From-Interference (FFI) violation (QM BodyControl -> ASIL-D Powertrain)');

  const hasDanglingPort = gwFindings.some((f) => f.rule_id === 'RULE-COMPLETENESS-01-DANGLING-PORT');
  assert(hasDanglingPort, 'Detect dangling port / missing provider');

  // 4.2 Clean BMS HLD validation (ZERO findings expected)
  const bmsFindings = validator.validate(bmsModel);
  assert(
    bmsFindings.length === 0,
    'Regression: Clean specification with synchronized ASIL & timing returns ZERO findings (no hardcoded leaks)',
    `Got ${bmsFindings.length} findings`
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Grounded RAG Retrieval, Document Filtering & Abstention
  // --------------------------------------------------------------------------
  console.log('\n[5/6] Running Grounded RAG & Document-Filtered Retrieval Tests...');
  const rag = new RAGPipeline();

  const gwChunks = chunkPages(gwPages, 'doc-gw', 'ECU_Central_Gateway_HLD_v2.4.pdf');
  const bmsChunks = chunkPages(bmsPages, 'doc-bms', 'Clean_BMS_Controller_HLD.pdf');
  const combinedChunks = [...gwChunks, ...bmsChunks];

  // 5.1 Document-level filtering
  const filteredBms = rag.retrieveChunks('Torque arbitration', combinedChunks, 'doc-bms', 5);
  assert(
    filteredBms.every((c) => c.document_id === 'doc-bms'),
    'Document-level filter strictly restricts retrieval to requested document (no cross-doc leakage)'
  );

  // 5.2 Negative Constraint / Abstention Detection
  assert(rag.isNegativeConstraint('What is the FlexRay cycle repetition parameter?'), 'Detect FlexRay as negative constraint');
  assert(rag.isNegativeConstraint('Explain LiDAR point cloud voxel clustering'), 'Detect LiDAR as negative constraint');
  assert(rag.isNegativeConstraint('What is the 5G C-V2X direct sidelink mode?'), 'Detect 5G C-V2X as negative constraint');
  assert(rag.isNegativeConstraint('What post-quantum cryptography is used?'), 'Detect post-quantum cryptography as negative constraint');

  const abstentionResp = await rag.executeQuery(
    'What is the FlexRay cycle repetition parameter for suspension leveling?',
    combinedChunks
  );
  assert(abstentionResp.status === 'ABSTAINED', 'Negative constraint query returns ABSTAINED status');
  assert(abstentionResp.citations.length === 0, 'Zero citations fabricated on negative constraint query');
  assert(
    abstentionResp.answer.toLowerCase().includes('not contain sufficient'),
    'Abstention answer explicitly states insufficient evidence'
  );

  // 5.3 Answer Grounding with Verifiable Citations
  const answerableResp = await rag.executeQuery(
    'Which software components communicate over CAN-FD channel 0?',
    gwChunks,
    'doc-gw'
  );
  assert(answerableResp.status === 'SUCCESS', 'Answerable query returns SUCCESS status');
  assert(answerableResp.citations.length > 0, 'Answerable query returns verifiable source citations');
  assert(
    answerableResp.citations.some((c) => c.page > 0 && c.section.length > 0 && c.snippet.length > 0),
    'Citations provide exact page number, section, and text snippet'
  );

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Academic Benchmark Runner & Ground Truth Evaluation
  // --------------------------------------------------------------------------
  console.log('\n[6/6] Running Standardized Evaluation Benchmark Suite...');
  const ptPath = path.resolve(__dirname, '../data/documents/Powertrain_Coordination_SWC_Specification.md');
  const ptText = fs.readFileSync(ptPath, 'utf-8');
  const { pages: ptPages } = extractFromText(ptText);
  const ptChunks = chunkPages(ptPages, 'doc-pt', 'Powertrain_Coordination_SWC_Specification.pdf');
  const corpusChunks = [...gwChunks, ...ptChunks];

  const runner = new BenchmarkRunner();
  const summary = await runner.run(rag, corpusChunks);

  assert(summary.total_questions >= 10, `Loaded ground truth evaluation suite (${summary.total_questions} questions)`);
  assert(summary.retrieval_recall_at_k >= 0.8, `Retrieval Recall@5 meets target (>= 80%): ${Math.round(summary.retrieval_recall_at_k * 100)}%`);
  assert(summary.citation_recall_rate >= 0.8, `Citation Recall Rate meets target (>= 80%): ${Math.round(summary.citation_recall_rate * 100)}%`);
  assert(summary.negative_constraint_passed, 'All negative constraint test cases abstained with 100% adherence');
  assert(summary.average_latency_ms < 500, `Average pipeline latency is within bounds (<500ms): ${summary.average_latency_ms}ms`);

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`Test Execution Summary:`);
  console.log(`  Total Tests Run:  ${totalTests}`);
  console.log(`  Passed Tests:      ${passedTests}`);
  console.log(`  Failed Tests:      ${failedTests}`);
  console.log(`  Pass Rate:         ${Math.round((passedTests / totalTests) * 100)}%`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error during test suite execution:', err);
  process.exit(1);
});
