from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.models.architecture import SourceEvidence


class ArchitectureFinding(BaseModel):
    id: str = Field(..., description="Unique finding UUID")
    rule_id: str = Field(..., description="Rule code e.g. RULE-01-DANGLING-PORT")
    severity: str = Field(..., description="HIGH, MEDIUM, or LOW")
    category: str = Field(..., description="Completeness, Consistency, Safety, Interface")
    title: str
    description: str
    entity_affected: str
    source_evidence: SourceEvidence
    suggested_action: str
    review_status: str = Field(default="PENDING", description="PENDING, ACCEPTED, REJECTED, or EDITED")
    engineer_comments: str = Field(default="", description="Human engineer review notes")
    reviewed_by: Optional[str] = Field(default=None, description="Engineer identifier or credentials")
    reviewed_at: Optional[str] = Field(default=None, description="Timestamp of review decision")


class ReviewUpdateRequest(BaseModel):
    status: str = Field(..., description="ACCEPTED, REJECTED, or EDITED")
    engineer_comments: str = Field(default="", description="Review rationale or modification notes")
    reviewed_by: str = Field(default="Lead_AUTOSAR_Engineer", description="Reviewer identifier")
    edited_action: Optional[str] = Field(default=None, description="Optional override of suggested action")


class ReviewSummary(BaseModel):
    total_findings: int
    pending_count: int
    accepted_count: int
    rejected_count: int
    edited_count: int
    high_severity_count: int
    medium_severity_count: int
    low_severity_count: int
