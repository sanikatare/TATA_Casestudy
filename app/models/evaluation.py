from typing import List, Optional
try:
    from pydantic import BaseModel, Field
except ImportError:
    from app.models.document import BaseModel, Field


class BenchmarkQuestion(BaseModel):
    """Fixed benchmark question from ground-truth suite."""
    id: str = ""
    category: str = ""
    question: str = ""
    expected_answer: str = ""
    target_document: str = ""
    target_page: int = 1
    target_section: Optional[str] = None
    keywords: List[str] = []


class BenchmarkResult(BaseModel):
    """Result of running a single benchmark question."""
    question_id: str = ""
    question: str = ""
    generated_answer: str = ""
    expected_answer: str = ""
    citation_found: bool = False
    retrieved_page: Optional[int] = None
    target_page: int = 1
    keyword_match_score: float = 0.0
    latency_ms: int = 0
    passed: bool = False


class BenchmarkSummary(BaseModel):
    """Aggregate benchmark evaluation summary."""
    total_questions: int = 0
    passed_count: int = 0
    citation_recall_rate: float = 0.0
    average_keyword_score: float = 0.0
    negative_constraint_passed: bool = False
    average_latency_ms: float = 0.0
    timestamp: str = ""
    results: List[BenchmarkResult] = []
