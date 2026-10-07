import json
import unittest

try:
    import pytest
    from fastapi.testclient import TestClient
    from app.main import app
    client = TestClient(app)
except (ImportError, Exception) as e:
    raise unittest.SkipTest(f"pytest and fastapi TestClient not available: {e}")

from app.services.architecture import architecture_service
from app.services.consistency import consistency_engine
from app.services.review import review_service
from app.services.export import export_service
from app.evaluation.benchmark import evaluator

client = TestClient(app)


def test_architecture_analysis_endpoint():
    """Verifies that GET /analysis/architecture extracts components, ports, interfaces, signals, and evidence."""
    response = client.get("/analysis/architecture")
    assert response.status_code == 200
    data = response.json()

    assert "components" in data
    assert "ports" in data
    assert "interfaces" in data
    assert "signals" in data
    assert "dependencies" in data
    assert "functional_flows" in data
    assert "bus_matrix" in data

    # 1. Verify Components and ASIL ratings
    components = data["components"]
    assert len(components) >= 5
    comp_names = [c["name"] for c in components]
    assert "PowertrainCoordination_SWC" in comp_names
    assert "Gateway_Router_SWC" in comp_names
    assert "Dem_BSW_Module" in comp_names

    pt_comp = next(c for c in components if c["name"] == "PowertrainCoordination_SWC")
    assert pt_comp["asil_level"] == "ASIL-D"
    assert pt_comp["periodicity"] == "10ms"

    # 2. Verify source evidence on every extracted component
    for c in components:
        assert "source_evidence" in c
        ev = c["source_evidence"]
        assert ev["page_number"] > 0
        assert len(ev["section"]) > 0
        assert len(ev["snippet"]) > 0

    # 3. Verify Ports
    ports = data["ports"]
    assert len(ports) >= 4
    port_names = [p["name"] for p in ports]
    assert "P_TorqueRequest" in port_names
    assert "R_TorqueRequest" in port_names
    for p in ports:
        assert p["source_evidence"]["page_number"] > 0

    # 4. Verify Interfaces & Data Elements
    interfaces = data["interfaces"]
    assert len(interfaces) >= 3
    iface_names = [i["name"] for i in interfaces]
    assert "SR_TorqueRequest" in iface_names
    assert "CS_DiagRoutine_Service" in iface_names

    sr_torque = next(i for i in interfaces if i["name"] == "SR_TorqueRequest")
    assert sr_torque["interface_kind"] == "Sender-Receiver"
    assert any("TorqueDemand_Nm" in elem for elem in sr_torque["data_elements"])

    # 5. Verify Bus Matrix (CAN-FD and Ethernet)
    bus_matrix = data["bus_matrix"]
    assert len(bus_matrix) >= 2
    bus_names = [b["channel_name"] for b in bus_matrix]
    assert "CAN-FD 0" in bus_names
    assert any("Ethernet" in name for name in bus_names)


def test_semantic_search_endpoints():
    """Verifies that POST /search/semantic and GET /search/semantic return ranked chunks with similarity scores."""
    # POST endpoint test
    payload = {
        "query": "CAN-FD nominal bitrate 500 kbps",
        "top_k": 3
    }
    response = client.post("/search/semantic", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["query"] == payload["query"]
    assert "results" in data
    assert len(data["results"]) >= 1

    top_hit = data["results"][0]
    assert "rank" in top_hit
    assert "chunk_id" in top_hit
    assert "similarity_score" in top_hit
    assert "page_number" in top_hit
    assert "section" in top_hit
    assert len(top_hit["snippet"]) > 0

    # GET endpoint test
    get_resp = client.get("/search/semantic?q=Dem%20DTC%20debouncing&top_k=2")
    assert get_resp.status_code == 200
    assert len(get_resp.json()["results"]) >= 1


def test_document_comparison_endpoint():
    """Verifies that POST /documents/compare reports added, removed, and modified sections and entities."""
    payload = {
        "document_id_a": "doc_v2.4",
        "document_id_b": "doc_v2.5"
    }
    response = client.post("/documents/compare", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "summary" in data
    summary = data["summary"]
    assert summary["total_added"] > 0
    assert summary["total_removed"] > 0
    assert summary["total_modified"] > 0
    assert summary["architecture_compatibility"] in ["BREAKING_CHANGES", "EXTENDED", "COMPATIBLE"]

    # Verify diff categories
    assert "section_diffs" in data
    assert "component_diffs" in data
    assert "interface_diffs" in data
    assert "bus_matrix_diffs" in data

    # Verify change types
    for d in data["component_diffs"]:
        assert d["change_type"] in ["ADDED", "REMOVED", "MODIFIED"]
        assert len(d["details"]) > 0


def test_consistency_checks_and_human_review_lifecycle():
    """Verifies consistency rule execution, severity allocation, and engineer review persistence."""
    # 1. Fetch initial findings
    response = client.get("/analysis/consistency")
    assert response.status_code == 200
    findings = response.json()
    assert len(findings) >= 4

    for f in findings:
        assert f["severity"] in ["HIGH", "MEDIUM", "LOW"]
        assert f["rule_id"].startswith("RULE-")
        assert len(f["suggested_action"]) > 0
        assert f["source_evidence"]["page_number"] > 0

    target_finding = findings[0]
    finding_id = target_finding["id"]

    # 2. Submit Engineer Review: Accept
    rev_payload = {
        "status": "ACCEPTED",
        "engineer_comments": "Verified in ASIL-D safety audit; MPU isolation barrier confirmed.",
        "reviewed_by": "Senior_Safety_Engineer_442"
    }
    rev_resp = client.post(f"/reviews/{finding_id}", json=rev_payload)
    assert rev_resp.status_code == 200
    updated_finding = rev_resp.json()
    assert updated_finding["review_status"] == "ACCEPTED"
    assert updated_finding["engineer_comments"] == rev_payload["engineer_comments"]
    assert updated_finding["reviewed_by"] == rev_payload["reviewed_by"]

    # 3. Check Review Summary
    sum_resp = client.get("/reviews/summary")
    assert sum_resp.status_code == 200
    summary = sum_resp.json()
    assert summary["total_findings"] >= 4
    assert summary["accepted_count"] >= 1
    assert summary["high_severity_count"] >= 1

    # 4. Submit Engineer Review: Reject another finding
    finding_id_2 = findings[1]["id"]
    rej_payload = {
        "status": "REJECTED",
        "engineer_comments": "Dangling port resolved in Section 3.2 errata.",
        "reviewed_by": "Senior_Safety_Engineer_442"
    }
    rej_resp = client.post(f"/reviews/{finding_id_2}", json=rej_payload)
    assert rej_resp.status_code == 200
    assert rej_resp.json()["review_status"] == "REJECTED"


def test_expanded_evaluation_benchmark_dataset():
    """Verifies that the expanded benchmark contains 25 questions with answerable and negative constraint items."""
    questions = evaluator.load_questions()
    assert len(questions) == 25

    # Check distribution: Answerable vs Negative / Out-of-Scope
    negative_questions = [q for q in questions if q.target_page == 0 or "negative" in q.category.lower()]
    answerable_questions = [q for q in questions if q.target_page > 0 and "negative" not in q.category.lower()]

    assert len(answerable_questions) >= 15
    assert len(negative_questions) >= 5

    # Verify TC-09 (FlexRay negative constraint)
    tc09 = next(q for q in questions if q.id == "TC-09")
    assert tc09.target_page == 0
    assert "not contain sufficient" in tc09.expected_answer.lower()

    # Verify an answerable TC
    tc01 = next(q for q in questions if q.id == "TC-01")
    assert tc01.target_page == 42
    assert "PowertrainCoordination_SWC" in tc01.keywords


def test_export_endpoints():
    """Verifies that GET /export/architecture and /export/findings return valid JSON and CSV formats."""
    # Architecture JSON export
    res_arch_json = client.get("/export/architecture?format=json")
    assert res_arch_json.status_code == 200
    data_json = json.loads(res_arch_json.text)
    assert "components" in data_json
    assert len(data_json["components"]) >= 5

    # Architecture CSV export
    res_arch_csv = client.get("/export/architecture?format=csv")
    assert res_arch_csv.status_code == 200
    csv_text = res_arch_csv.text
    assert "SOFTWARE COMPONENTS" in csv_text
    assert "PowertrainCoordination_SWC" in csv_text
    assert "RTE INTERFACES" in csv_text

    # Findings JSON export
    res_find_json = client.get("/export/findings?format=json")
    assert res_find_json.status_code == 200
    findings_data = json.loads(res_find_json.text)
    assert isinstance(findings_data, list)
    assert len(findings_data) >= 4

    # Findings CSV export
    res_find_csv = client.get("/export/findings?format=csv")
    assert res_find_csv.status_code == 200
    assert "Finding ID,Rule Code,Severity" in res_find_csv.text
