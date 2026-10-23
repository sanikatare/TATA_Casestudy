import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RAGPipeline } from './rag';
import { AutosarChunk } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface GroundTruthQuestion {
  id: string;
  category: string;
  question: string;
  expected_answer: string;
  target_document: string;
  target_page: number;
  target_section: string;
  keywords: string[];
}

export interface BenchmarkResultItem {
  id: string;
  category: string;
  question: string;
  expected_answer: string;
  actual_answer: string;
  target_page: number;
  retrieved_pages: number[];
  citation_found: boolean;
  keyword_score: number;
  is_negative_constraint: boolean;
  negative_passed: boolean;
  passed: boolean;
  latency_ms: number;
}

export interface BenchmarkSummary {
  total_questions: number;
  passed_count: number;
  retrieval_recall_at_k: number;
  citation_recall_rate: number;
  average_keyword_score: number;
  negative_constraint_passed: boolean;
  negative_constraint_accuracy: number;
  average_latency_ms: number;
  timestamp: string;
  results: BenchmarkResultItem[];
}

export class BenchmarkRunner {
  private groundTruthPath: string;

  constructor(groundTruthPath?: string) {
    this.groundTruthPath =
      groundTruthPath ||
      path.resolve(__dirname, '../../data/evaluation/ground_truth.json');
  }

  public loadGroundTruth(): GroundTruthQuestion[] {
    if (!fs.existsSync(this.groundTruthPath)) {
      console.warn(`[Benchmark] Ground truth file not found at ${this.groundTruthPath}`);
      return [];
    }
    const raw = fs.readFileSync(this.groundTruthPath, 'utf-8');
    return JSON.parse(raw);
  }

  public async run(rag: RAGPipeline, chunks: AutosarChunk[]): Promise<BenchmarkSummary> {
    const questions = this.loadGroundTruth();
    const results: BenchmarkResultItem[] = [];

    let totalRetrievalHits = 0;
    let totalCitationHits = 0;
    let totalKeywordScore = 0;
    let totalLatency = 0;

    let negativeCount = 0;
    let negativePassedCount = 0;

    for (const q of questions) {
      const isNegative = q.target_page === 0 || q.category.toLowerCase().includes('negative');
      const t0 = Date.now();

      const resp = await rag.executeQuery(q.question, chunks, undefined, 5);
      const latency = Date.now() - t0;
      totalLatency += latency;

      const retrievedPages = resp.citations.map((c) => c.page);

      if (isNegative) {
        negativeCount++;
        const abstainedCorrectly =
          resp.status === 'ABSTAINED' ||
          resp.status === 'NO_GROUNDING' ||
          /not contain sufficient|insufficient|not specified/i.test(resp.answer);
        const zeroFabricatedCitations = resp.citations.length === 0;
        const passed = abstainedCorrectly && zeroFabricatedCitations;

        if (passed) {
          negativePassedCount++;
          totalRetrievalHits++;
          totalCitationHits++;
          totalKeywordScore += 1.0;
        } else {
          totalKeywordScore += 0.5;
        }

        results.push({
          id: q.id,
          category: q.category,
          question: q.question,
          expected_answer: q.expected_answer,
          actual_answer: resp.answer,
          target_page: q.target_page,
          retrieved_pages: retrievedPages,
          citation_found: zeroFabricatedCitations,
          keyword_score: passed ? 1.0 : 0.5,
          is_negative_constraint: true,
          negative_passed: passed,
          passed,
          latency_ms: latency,
        });
      } else {
        const targetPageFound =
          retrievedPages.includes(q.target_page) ||
          resp.citations.some(
            (c) =>
              c.page === q.target_page ||
              (q.target_section &&
                q.target_section !== 'None' &&
                c.section.toLowerCase().includes(q.target_section.slice(0, 10).toLowerCase()))
          );
        if (targetPageFound) {
          totalRetrievalHits++;
          totalCitationHits++;
        }

        // Calculate keyword match score
        const lowerAnswer = resp.answer.toLowerCase();
        let matchedCount = 0;
        for (const kw of q.keywords) {
          if (lowerAnswer.includes(kw.toLowerCase())) {
            matchedCount++;
          }
        }

        const kwScore = q.keywords.length > 0 ? Number((matchedCount / q.keywords.length).toFixed(2)) : 1.0;
        totalKeywordScore += kwScore;

        const passed = targetPageFound && kwScore >= 0.5;

        results.push({
          id: q.id,
          category: q.category,
          question: q.question,
          expected_answer: q.expected_answer,
          actual_answer: resp.answer,
          target_page: q.target_page,
          retrieved_pages: retrievedPages,
          citation_found: targetPageFound,
          keyword_score: kwScore,
          is_negative_constraint: false,
          negative_passed: true,
          passed,
          latency_ms: latency,
        });
      }
    }

    const total = questions.length || 1;
    const passedCount = results.filter((r) => r.passed).length;
    const avgLatency = Math.round(totalLatency / total);

    return {
      total_questions: total,
      passed_count: passedCount,
      retrieval_recall_at_k: Number((totalRetrievalHits / total).toFixed(2)),
      citation_recall_rate: Number((totalCitationHits / total).toFixed(2)),
      average_keyword_score: Number((totalKeywordScore / total).toFixed(2)),
      negative_constraint_passed: negativePassedCount === negativeCount,
      negative_constraint_accuracy: negativeCount > 0 ? Number((negativePassedCount / negativeCount).toFixed(2)) : 1.0,
      average_latency_ms: avgLatency,
      timestamp: new Date().toISOString(),
      results,
    };
  }
}
