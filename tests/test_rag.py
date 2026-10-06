from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_query_execution():
    payload = {
        "question": "Which components communicate with the Gateway over CAN-FD?",
        "top_k": 3
    }
    response = client.post("/chat/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "citations" in data
    assert isinstance(data["citations"], list)
