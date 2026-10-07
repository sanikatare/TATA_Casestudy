from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models.findings import ArchitectureFinding, ReviewUpdateRequest, ReviewSummary
from app.services.database import db
from app.services.consistency import consistency_engine
from app.utils.logging import logger


class HumanReviewService:
    """
    Manages engineering review decisions (Accept / Reject / Edit) for consistency findings.
    Persists decision rationale, engineer credentials, and modified actions directly into SQLite.
    """

    def get_findings_with_reviews(self, document_id: Optional[str] = None) -> List[ArchitectureFinding]:
        """Runs checks and synchronizes with existing persistent reviews."""
        return consistency_engine.run_checks(document_id)

    def submit_review(self, finding_id: str, request: ReviewUpdateRequest) -> Optional[ArchitectureFinding]:
        """Applies engineer decision (ACCEPTED, REJECTED, EDITED) to a finding."""
        review_timestamp = datetime.utcnow().isoformat()
        db.update_review(
            finding_id=finding_id,
            status=request.status,
            comments=request.engineer_comments,
            reviewed_by=request.reviewed_by,
            reviewed_at=review_timestamp,
            edited_action=request.edited_action
        )

        # Retrieve updated record
        updated = db.get_review(finding_id)
        if not updated:
            return None

        from app.models.architecture import SourceEvidence
        return ArchitectureFinding(
            id=updated["finding_id"],
            rule_id=updated["rule_id"],
            severity=updated["severity"],
            category=updated["category"],
            title=updated["title"],
            description=updated["description"],
            entity_affected=updated["entity_affected"],
            source_evidence=SourceEvidence(
                page_number=updated["page_number"],
                section=updated.get("section", "General"),
                snippet=updated.get("snippet", "")
            ),
            suggested_action=updated.get("suggested_action", ""),
            review_status=updated["review_status"],
            engineer_comments=updated.get("engineer_comments", ""),
            reviewed_by=updated.get("reviewed_by"),
            reviewed_at=updated.get("reviewed_at")
        )

    def get_review_summary(self, document_id: Optional[str] = None) -> ReviewSummary:
        findings = self.get_findings_with_reviews(document_id)
        return consistency_engine.get_summary(findings)


review_service = HumanReviewService()
