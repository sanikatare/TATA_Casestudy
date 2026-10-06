from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings
from backend.app.database.database import init_db
from backend.app.utils.logging import logger
from backend.app.api.health import router as health_router
from backend.app.api.documents import router as documents_router
from backend.app.api.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown events."""
    logger.info("Initializing AUTOSAR HLD Analysis Assistant Backend...")
    settings.ensure_directories()
    init_db()
    logger.info("Backend foundation ready and listening for requests.")
    yield
    logger.info("Shutting down AUTOSAR HLD Analysis Assistant Backend.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend REST API for AUTOSAR High-Level Design (HLD) document ingestion and semantic RAG retrieval.",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler returning clean engineering error response without leaking internal traces."""
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the request.",
            "path": request.url.path,
        },
    )


# Mount routers
app.include_router(health_router)
app.include_router(documents_router)
app.include_router(chat_router)


@app.get("/")
def root():
    """Root entrypoint providing service status and available endpoints."""
    return {
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_check": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG,
    )
