from typing import List, Dict, Any
from fastapi import APIRouter
from backend.app.database.repositories import QueryRepository

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.get("/history", response_model=List[Dict[str, Any]])
def get_query_history(limit: int = 50):
    """Retrieve historical queries and citations."""
    return QueryRepository.list_history(limit=limit)
