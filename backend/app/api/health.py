from fastapi import APIRouter
from backend.app.database.database import get_db_connection
from backend.app.utils.logging import logger

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health():
    """
    Health check endpoint returning system health status.
    Expected: {"status": "healthy"}
    """
    try:
        # Verify SQLite connectivity
        with get_db_connection() as conn:
            conn.execute("SELECT 1;").fetchone()
        db_status = "connected"
    except Exception as e:
        logger.warning(f"Health check SQLite ping failed: {e}")
        db_status = "degraded"

    return {
        "status": "healthy"
    }


@router.get("/health/details")
def get_health_details():
    """Extended diagnostic health status for admin & dashboard inspection."""
    from backend.app.config import settings
    db_ok = True
    try:
        with get_db_connection() as conn:
            conn.execute("SELECT 1;").fetchone()
    except Exception:
        db_ok = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "AUTOSAR HLD Analysis Assistant",
        "version": settings.APP_VERSION,
        "database": {
            "type": "SQLite",
            "connected": db_ok,
            "path": str(settings.SQLITE_DB_PATH)
        },
        "storage": {
            "uploads_dir": str(settings.UPLOADS_DIR),
            "chroma_dir": str(settings.CHROMA_PERSIST_DIR)
        },
        "configuration": {
            "embedding_model": settings.EMBEDDING_MODEL,
            "llm_provider": settings.LLM_PROVIDER
        }
    }
