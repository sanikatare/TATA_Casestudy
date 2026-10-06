import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database.database import init_db, get_db_connection


@pytest.fixture(autouse=True)
def setup_test_db():
    """Initializes the database schema before running test assertions."""
    init_db()


def test_health_endpoint():
    """Verifies that GET /health responds with 200 OK and exactly {'status': 'healthy'}."""
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


def test_root_endpoint():
    """Verifies that GET / responds with service status information."""
    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "online"
        assert "AUTOSAR" in data.get("service")


def test_database_initialization():
    """Verifies SQLite tables (documents, queries, citations) exist after init_db()."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {row[0] for row in cursor.fetchall()}
        assert "documents" in tables
        assert "queries" in tables
        assert "citations" in tables
