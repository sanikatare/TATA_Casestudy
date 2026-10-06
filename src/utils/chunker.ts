/**
 * AUTOSAR High-Level Design (HLD) Document Chunking Engine
 * 
 * Implements context-aware, paragraph- and section-preserving chunking
 * tailored to automotive engineering specifications.
 * 
 * Core Principles:
 * 1. Never blindly cut at arbitrary character count boundaries.
 * 2. Maintain strict page-level attribution for legal/safety audit trails.
 * 3. Track hierarchical section headings (e.g. "4.2 Bus Matrix", "2.4 Safety Goals").
 * 4. Filter trivial or meaningless fragments (under minimum token threshold).
 * 5. Provide full traceability metadata (chunk_id, doc_id, page_no, section, filename).
 */

export interface DocumentPage {
  page_number: number;
  text: string;
}

export interface ChunkMetadata {
  ecu_domain?: string;
  asil_level?: string;
  headings_stack: string[];
  char_count: number;
  token_estimate: number;
  is_table_or_matrix?: boolean;
}

export interface AutosarChunk {
  chunk_id: string;
  document_id: string;
  page_number: number;
  section: string;
  text: string;
  source_filename: string;
  token_count: number;
  metadata: ChunkMetadata;
}

export interface ChunkingOptions {
  chunkSizeTokens: number; // default ~512 tokens (~2000 chars)
  chunkOverlapTokens: number; // default ~64 tokens (~250 chars)
  minChunkTokens: number; // default ~20 tokens (~80 chars) to drop noise
  preservePageBoundaries: boolean; // default true to avoid cross-page contamination
}

export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSizeTokens: 512,
  chunkOverlapTokens: 64,
  minChunkTokens: 20,
  preservePageBoundaries: true
};

/**
 * Approximate token count for technical English (approx. 4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().length / 4);
}

/**
 * Detect section headings like "4.2 CAN-FD Bus Matrix", "Section 3.1", "### Diagnostic Event Manager"
 */
function isHeadingLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 90) return false;
  // Patterns: "1.", "1.2", "4.2.1", "Section X", "CHAPTER", or Markdown "#"
  const sectionNumberRegex = /^(\d+(\.\d+)*\s+[A-Z][\w\s\-_/()]+)$/;
  const sectionWordRegex = /^(Section|Chapter|Appendix)\s+[\d\w.]+/i;
  const mdHeadingRegex = /^#{1,4}\s+.+/;
  const uppercaseShort = /^[A-Z0-9\s\-_/()]{5,60}$/.test(trimmed) && trimmed.split(' ').length <= 6;
  
  return sectionNumberRegex.test(trimmed) || sectionWordRegex.test(trimmed) || mdHeadingRegex.test(trimmed) || uppercaseShort;
}

/**
 * Chunk a document's extracted pages while preserving section hierarchy and page numbers.
 */
export function chunkDocument(
  documentId: string,
  filename: string,
  pages: DocumentPage[],
  options: Partial<ChunkingOptions> = {}
): { chunks: AutosarChunk[]; debugStats: { totalPages: number; totalChunks: number; avgChunkTokens: number; droppedSmallChunks: number } } {
  const opts: ChunkingOptions = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
  const chunks: AutosarChunk[] = [];
  let chunkCounter = 1;
  let droppedCount = 0;

  let currentHeading = "General Specification";
  const headingStack: string[] = ["General Specification"];

  for (const page of pages) {
    const rawLines = page.text.split('\n');
    const paragraphs: { text: string; section: string; isTable: boolean }[] = [];
    let currentParagraphLines: string[] = [];
    let isCurrentTable = false;

    for (const rawLine of rawLines) {
      const line = rawLine.trim();
      if (!line) {
        if (currentParagraphLines.length > 0) {
          paragraphs.push({
            text: currentParagraphLines.join(' '),
            section: currentHeading,
            isTable: isCurrentTable
          });
          currentParagraphLines = [];
          isCurrentTable = false;
        }
        continue;
      }

      if (isHeadingLine(line)) {
        // Flush previous paragraph
        if (currentParagraphLines.length > 0) {
          paragraphs.push({
            text: currentParagraphLines.join(' '),
            section: currentHeading,
            isTable: isCurrentTable
          });
          currentParagraphLines = [];
          isCurrentTable = false;
        }
        currentHeading = line.replace(/^#+\s*/, '').trim();
        headingStack.push(currentHeading);
        if (headingStack.length > 3) headingStack.shift();
        continue;
      }

      // Detect table / bus matrix lines (e.g. pipe delimited or tabbed columns)
      if (line.includes('|') || line.includes('\t') || line.includes('0x') && line.includes('kbps')) {
        isCurrentTable = true;
      }

      currentParagraphLines.push(line);
    }

    if (currentParagraphLines.length > 0) {
      paragraphs.push({
        text: currentParagraphLines.join(' '),
        section: currentHeading,
        isTable: isCurrentTable
      });
    }

    // Now pack paragraphs on this page into token-sized chunks with overlap
    let accumulator: string[] = [];
    let accumulatedTokens = 0;
    let chunkSection = currentHeading;
    let containsTable = false;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pTokens = estimateTokens(p.text);

      if (accumulatedTokens + pTokens <= opts.chunkSizeTokens) {
        accumulator.push(p.text);
        accumulatedTokens += pTokens;
        if (p.isTable) containsTable = true;
        if (accumulator.length === 1) chunkSection = p.section;
      } else {
        // We reached max chunk size
        if (accumulator.length > 0) {
          const chunkText = accumulator.join('\n\n');
          const tokenCount = estimateTokens(chunkText);

          if (tokenCount >= opts.minChunkTokens) {
            chunks.push({
              chunk_id: `chk_${documentId}_p${String(page.page_number).padStart(3, '0')}_${String(chunkCounter++).padStart(3, '0')}`,
              document_id: documentId,
              page_number: page.page_number,
              section: chunkSection,
              text: chunkText,
              source_filename: filename,
              token_count: tokenCount,
              metadata: {
                headings_stack: [...headingStack],
                char_count: chunkText.length,
                token_estimate: tokenCount,
                is_table_or_matrix: containsTable,
                ecu_domain: inferDomain(chunkText),
                asil_level: inferAsil(chunkText)
              }
            });
          } else {
            droppedCount++;
          }

          // Handle overlap: retain end of prior text if overlap requested
          if (opts.chunkOverlapTokens > 0 && accumulator.length > 1) {
            const lastPart = accumulator[accumulator.length - 1];
            if (estimateTokens(lastPart) <= opts.chunkOverlapTokens) {
              accumulator = [lastPart, p.text];
              accumulatedTokens = estimateTokens(lastPart) + pTokens;
            } else {
              accumulator = [p.text];
              accumulatedTokens = pTokens;
            }
          } else {
            accumulator = [p.text];
            accumulatedTokens = pTokens;
          }
          chunkSection = p.section;
          containsTable = p.isTable;
        } else {
          // A single paragraph is larger than chunkSizeTokens, split by sentence
          const sentences = splitIntoSentences(p.text);
          let sentenceAcc: string[] = [];
          let sTokensAcc = 0;

          for (const s of sentences) {
            const sTok = estimateTokens(s);
            if (sTokensAcc + sTok <= opts.chunkSizeTokens) {
              sentenceAcc.push(s);
              sTokensAcc += sTok;
            } else {
              if (sentenceAcc.length > 0) {
                const sChunkText = sentenceAcc.join(' ');
                chunks.push({
                  chunk_id: `chk_${documentId}_p${String(page.page_number).padStart(3, '0')}_${String(chunkCounter++).padStart(3, '0')}`,
                  document_id: documentId,
                  page_number: page.page_number,
                  section: p.section,
                  text: sChunkText,
                  source_filename: filename,
                  token_count: estimateTokens(sChunkText),
                  metadata: {
                    headings_stack: [...headingStack],
                    char_count: sChunkText.length,
                    token_estimate: estimateTokens(sChunkText),
                    is_table_or_matrix: p.isTable,
                    ecu_domain: inferDomain(sChunkText),
                    asil_level: inferAsil(sChunkText)
                  }
                });
              }
              sentenceAcc = [s];
              sTokensAcc = sTok;
            }
          }
          if (sentenceAcc.length > 0) {
            accumulator = [sentenceAcc.join(' ')];
            accumulatedTokens = sTokensAcc;
          }
        }
      }
    }

    // Flush remainder for page
    if (accumulator.length > 0) {
      const remainingText = accumulator.join('\n\n');
      const tokenCount = estimateTokens(remainingText);
      if (tokenCount >= opts.minChunkTokens) {
        chunks.push({
          chunk_id: `chk_${documentId}_p${String(page.page_number).padStart(3, '0')}_${String(chunkCounter++).padStart(3, '0')}`,
          document_id: documentId,
          page_number: page.page_number,
          section: chunkSection,
          text: remainingText,
          source_filename: filename,
          token_count: tokenCount,
          metadata: {
            headings_stack: [...headingStack],
            char_count: remainingText.length,
            token_estimate: tokenCount,
            is_table_or_matrix: containsTable,
            ecu_domain: inferDomain(remainingText),
            asil_level: inferAsil(remainingText)
          }
        });
      } else {
        droppedCount++;
      }
    }
  }

  const totalTokens = chunks.reduce((acc, c) => acc + c.token_count, 0);
  const avgChunkTokens = chunks.length > 0 ? Math.round(totalTokens / chunks.length) : 0;

  return {
    chunks,
    debugStats: {
      totalPages: pages.length,
      totalChunks: chunks.length,
      avgChunkTokens,
      droppedSmallChunks: droppedCount
    }
  };
}

function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
}

function inferDomain(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('can') || t.includes('routing') || t.includes('gateway')) return 'Central Gateway / Networking';
  if (t.includes('torque') || t.includes('powertrain') || t.includes('bms')) return 'Powertrain & High Voltage';
  if (t.includes('adas') || t.includes('radar') || t.includes('camera')) return 'ADAS / Vision Perception';
  if (t.includes('body') || t.includes('lighting') || t.includes('lock')) return 'Body & Comfort Control';
  return 'General Automotive Architecture';
}

function inferAsil(text: string): string {
  if (text.includes('ASIL-D') || text.includes('ASIL D')) return 'ASIL-D';
  if (text.includes('ASIL-C') || text.includes('ASIL C')) return 'ASIL-C';
  if (text.includes('ASIL-B') || text.includes('ASIL B')) return 'ASIL-B';
  if (text.includes('ASIL-A') || text.includes('ASIL A')) return 'ASIL-A';
  return 'QM (Quality Management)';
}
