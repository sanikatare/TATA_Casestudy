import json
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

from app.config import settings
from app.utils.logging import logger
from app.models.query import QueryRequest
from app.models.evaluation import BenchmarkQuestion, BenchmarkResult, BenchmarkSummary
from app.rag.pipeline import rag_pipeline


class BenchmarkEvaluator:
    """
    Standardized Academic Benchmark Evaluator.
    Runs a fixed 10-question evaluation suite against ground-truth automotive criteria.
    Calculates Citation Recall, Factuality/Keyword Match, and Negative Constraint Compliance.
    """

    def __init__(self, ground_truth_file: Path = Path("./data/evaluation/ground_truth.json")):
        self.ground_truth_file = ground_truth_file

    def load_questions(self) -> List[BenchmarkQuestion]:
        """Loads fixed test questions from JSON dataset."""
        if not self.ground_truth_file.exists():
            logger.warning(f"Ground truth dataset not found at {self.ground_truth_file}")
            return []

        with open(self.ground_truth_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [BenchmarkQuestion(**item) for item in data]

    def run_benchmark(self) -> BenchmarkSummary:
        """Executes test questions through the RAG pipeline and computes measurable metrics."""
        questions = self.load_questions()
        if not questions:
            return BenchmarkSummary(
                total_questions=0,
                passed_count=0,
                citation_recall_rate=0.0,
                average_keyword_score=0.0,
                negative_constraint_passed=False,
                average_latency_ms=0.0,
                timestamp=datetime.utcnow().isoformat(),
                results=[]
            )

        results: List[BenchmarkResult] = []
        total_latency = 0
        citation_hits = 0
        retrieval_hits = 0
        keyword_scores = []
        negative_questions_count = 0
        negative_questions_passed = 0
        grounded_count = 0
        answer_correct_count = 0

        for q in questions:
            t0 = time.time()
            req = QueryRequest(question=q.question, top_k=5)
            resp = rag_pipeline.execute_query(req)
            elapsed_ms = int((time.time() - t0) * 1000)
            total_latency += elapsed_ms

            retrieved_pages = [c.page for c in resp.citations]
            is_negative_q = (q.target_page == 0) or ("negative" in q.category.lower())

            # 1. Retrieval Hit@K & Citation Accuracy
            if is_negative_q:
                retrieval_hit = True  # Negative question target is correctly absent
                citation_found = True
            else:
                retrieval_hit = (q.target_page in retrieved_pages)
                citation_found = retrieval_hit

            if retrieval_hit:
                retrieval_hits += 1
            if citation_found:
                citation_hits += 1

            # 2. Evaluate Keyword/Entity Coverage
            answer_lower = resp.answer.lower()
            matched_kw = sum(1 for kw in q.keywords if kw.lower() in answer_lower)
            kw_score = matched_kw / len(q.keywords) if q.keywords else 1.0
            keyword_scores.append(kw_score)

            # 3. Evaluate Unanswerable Refusal (hallucination defense)
            refusal_detected = any(phrase in answer_lower for phrase in [
                "not contain sufficient", "not specified", "does not contain",
                "insufficient evidence", "not present", "not documented",
                "out of scope", "insufficient to answer"
            ])

            if is_negative_q:
                negative_questions_count += 1
                unanswerable_handled = refusal_detected
                if refusal_detected:
                    negative_questions_passed += 1
                test_passed = refusal_detected
                is_grounded = refusal_detected
                answer_correct = refusal_detected
            else:
                unanswerable_handled = True
                test_passed = (kw_score >= 0.50) and citation_found
                is_grounded = bool(resp.status == "SUCCESS" and citation_found)
                answer_correct = (kw_score >= 0.50)

            if is_grounded:
                grounded_count += 1
            if answer_correct:
                answer_correct_count += 1

            results.append(BenchmarkResult(
                question_id=q.id,
                question=q.question,
                generated_answer=resp.answer,
                expected_answer=q.expected_answer,
                citation_found=citation_found,
                retrieved_page=retrieved_pages[0] if retrieved_pages else None,
                target_page=q.target_page,
                keyword_match_score=round(kw_score, 2),
                latency_ms=elapsed_ms,
                passed=test_passed,
                retrieval_hit=retrieval_hit,
                citation_correct=citation_found,
                grounded=is_grounded,
                answer_correct=answer_correct,
                unanswerable_handled=unanswerable_handled
            ))

        passed_count = sum(1 for r in results if r.passed)
        total_q = len(questions)
        citation_recall = round((citation_hits / total_q) * 100, 1)
        retrieval_hit_at_k = round((retrieval_hits / total_q) * 100, 1)
        avg_kw = round((sum(keyword_scores) / len(keyword_scores)) * 100, 1)
        avg_lat = round(total_latency / total_q, 1)

        neg_refusal_rate = round(
            (negative_questions_passed / negative_questions_count * 100.0) if negative_questions_count > 0 else 100.0, 1
        )
        groundedness = round((grounded_count / total_q) * 100, 1)
        answer_correct_rate = round((answer_correct_count / total_q) * 100, 1)

        summary = BenchmarkSummary(
            total_questions=total_q,
            passed_count=passed_count,
            citation_recall_rate=citation_recall,
            average_keyword_score=avg_kw,
            negative_constraint_passed=(negative_questions_passed == negative_questions_count),
            negative_constraint_refusal_rate=neg_refusal_rate,
            groundedness_score=groundedness,
            average_latency_ms=avg_lat,
            retrieval_hit_at_k=retrieval_hit_at_k,
            recall_at_k=citation_recall,
            citation_correctness=citation_recall,
            answer_correctness_rate=answer_correct_rate,
            unanswerable_refusal_rate=neg_refusal_rate,
            timestamp=datetime.utcnow().isoformat(),
            results=results
        )

        logger.info(
            f"Benchmark complete: {passed_count}/{len(questions)} passed. "
            f"Citation Recall: {citation_recall}%, Avg Latency: {avg_lat}ms"
        )
        return summary


evaluator = BenchmarkEvaluator()
