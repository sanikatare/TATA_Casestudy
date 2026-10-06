from typing import List, Dict, Any
from fastapi import APIRouter
from backend.app.database.repositories import DocumentRepository

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get("", response_model=List[Dict[str, Any]])
def list_documents():
    """List all ingested AUTOSAR HLD documents."""
    return DocumentRepository.list_all()
