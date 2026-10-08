import json
import unittest
from typing import Dict, Any

from app.services.architecture import architecture_service
from app.services.consistency import consistency_engine
from app.services.review import review_service
from app.services.export import export_service
from app.services.search import search_service, SemanticSearchRequest
from app.services.comparison import comparison_service
from app.models.findings import ReviewUpdateRequest
from app.evaluation.benchmark import evaluator


class MockResponse:
    def __init__(self, status_code: int, json_data: Any = None, text: str = ""):
        self.status_code = status_code
        self._json = json_data
        self.text = text or (json.dumps(json_data) if json_data is not None else "")

    def json(self):
        return self._json


class LocalAPIClient:
    """Direct service execution client providing seamless test client capability."""
    def get(self, path: str) -> MockResponse:
        clean_path = path.split("?")[0]
        params = {}
        if "?" in path:
            for pair in path.split("?")[1].split("&"):
                if "=" in pair:
                    k, v = pair.split("=", 1)
                    params[k] = v

        if clean_path == "/analysis/architecture":
            model = architecture_service.analyze_document()
            return MockResponse(200, model.model_dump())
        elif clean_path == "/search/semantic":
            req = SemanticSearchRequest(
                query=params.get("q", ""),
                top_k=int(params.get("top_k", 5))
            )
            res = search_service.search(req)
            return MockResponse(200, res.model_dump())
        elif clean_path == "/analysis/consistency":
            findings = consistency_engine.run_checks()
            return MockResponse(200, [f.model_dump() for f in findings])
        elif clean_path == "/reviews/summary":
            summary = review_service.get_review_summary()
            return MockResponse(200, summary.model_dump())
        elif clean_path == "/export/architecture":
            fmt = params.get("format", "json")
            if fmt == "csv":
                return MockResponse(200, text=export_service.export_architecture_csv())
            return MockResponse(200, text=export_service.export_architecture_json())
        elif clean_path == "/export/findings":
            fmt = params.get("format", "json")
            if fmt == "csv":
                return MockResponse(200, text=export_service.export_findings_csv())
            return MockResponse(200, text=export_service.export_findings_json())
        return MockResponse(404, {"error": "Not Found"})

    def post(self, path: str, json: Dict[str, Any] = None) -> MockResponse:
        data = json or {}
        if path == "/search/semantic":
            req = SemanticSearchRequest(**data)
            res = search_service.search(req)
            return MockResponse(200, res.model_dump())
        elif path == "/documents/compare":
            res = comparison_service.compare_documents(data.get("document_id_a", ""), data.get("document_id_b", ""))
            return MockResponse(200, res.model_dump())
        elif path.startswith("/reviews/"):
            finding_id = path.replace("/reviews/", "").strip()
            rev_req = ReviewUpdateRequest(**data)
            res = review_service.submit_review(finding_id, rev_req)
            if res:
                return MockResponse(200, res.model_dump())
            return MockResponse(404, {"error": "Finding not found"})
        return MockResponse(404, {"error": "Not Found"})


client = LocalAPIClient()


class TestCaseStudy1Features(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from pathlib import Path
        from app.ingestion.service import IngestionService
        sample = Path("./data/documents/sample_autosar_hld.pdf")
        if not sample.exists():
            from data.documents.generate_sample_pdf import main as gen_pdf
            gen_pdf()
        ing = IngestionService()
        cls.doc = ing.ingest_file(sample, "sample_autosar_hld.pdf")["document"]

    def test_architecture_analysis_endpoint(self):
        """Verifies that GET /analysis/architecture extracts components, ports, interfaces, signals, and evidence."""
        response = client.get("/analysis/architecture")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("components", data)
        self.assertIn("ports", data)
        self.assertIn("interfaces", data)
        self.assertIn("signals", data)
        self.assertIn("dependencies", data)
        self.assertIn("functional_flows", data)
        self.assertIn("bus_matrix", data)

        components = data["components"]
        self.assertGreaterEqual(len(components), 5)
        comp_names = [c["name"] for c in components]
        self.assertIn("PowertrainCoordination_SWC", comp_names)
        self.assertIn("Gateway_Router_SWC", comp_names)
        self.assertIn("Dem_BSW_Module", comp_names)

        pt_comp = next(c for c in components if c["name"] == "PowertrainCoordination_SWC")
        self.assertEqual(pt_comp["asil_level"], "ASIL-D")
        self.assertEqual(pt_comp["periodicity"], "10ms")

        for c in components:
            self.assertIn("source_evidence", c)
            ev = c["source_evidence"]
            self.assertGreater(ev["page_number"], 0)
            self.assertGreater(len(ev["section"]), 0)
            self.assertGreater(len(ev["snippet"]), 0)

        ports = data["ports"]
        self.assertGreaterEqual(len(ports), 4)
        port_names = [p["name"] for p in ports]
        self.assertIn("P_TorqueRequest", port_names)
        self.assertIn("R_TorqueRequest", port_names)
        for p in ports:
            self.assertGreater(p["source_evidence"]["page_number"], 0)

        interfaces = data["interfaces"]
        self.assertGreaterEqual(len(interfaces), 3)
        iface_names = [i["name"] for i in interfaces]
        self.assertIn("SR_TorqueRequest", iface_names)
        self.assertIn("CS_DiagRoutine_Service", iface_names)

        sr_torque = next(i for i in interfaces if i["name"] == "SR_TorqueRequest")
        self.assertEqual(sr_torque["interface_kind"], "Sender-Receiver")
        self.assertTrue(any("TorqueDemand_Nm" in elem for elem in sr_torque["data_elements"]))

        bus_matrix = data["bus_matrix"]
        self.assertGreaterEqual(len(bus_matrix), 2)
        bus_names = [b["channel_name"] for b in bus_matrix]
        self.assertIn("CAN-FD 0", bus_names)
        self.assertTrue(any("Ethernet" in name for name in bus_names))

    def test_semantic_search_endpoints(self):
        """Verifies that POST /search/semantic and GET /search/semantic return ranked chunks with similarity scores."""
        payload = {
            "query": "CAN-FD nominal bitrate 500 kbps",
            "top_k": 3
        }
        response = client.post("/search/semantic", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["query"], payload["query"])
        self.assertIn("results", data)
        self.assertGreaterEqual(len(data["results"]), 1)

        top_hit = data["results"][0]
        self.assertIn("rank", top_hit)
        self.assertIn("chunk_id", top_hit)
        self.assertIn("similarity_score", top_hit)
        self.assertIn("page_number", top_hit)
        self.assertIn("section", top_hit)
        self.assertGreater(len(top_hit["snippet"]), 0)

        get_resp = client.get("/search/semantic?q=Dem%20DTC%20debouncing&top_k=2")
        self.assertEqual(get_resp.status_code, 200)
        self.assertGreaterEqual(len(get_resp.json()["results"]), 1)

    def test_document_comparison_endpoint(self):
        """Verifies that POST /documents/compare reports added, removed, and modified sections and entities."""
        payload = {
            "document_id_a": "doc_v2.4",
            "document_id_b": "doc_v2.5"
        }
        response = client.post("/documents/compare", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("summary", data)
        summary = data["summary"]
        self.assertGreater(summary["total_added"], 0)
        self.assertGreater(summary["total_removed"], 0)
        self.assertGreater(summary["total_modified"], 0)
        self.assertIn(summary["architecture_compatibility"], ["BREAKING_CHANGES", "EXTENDED", "COMPATIBLE"])

        self.assertIn("section_diffs", data)
        self.assertIn("component_diffs", data)
        self.assertIn("interface_diffs", data)
        self.assertIn("bus_matrix_diffs", data)

        for d in data["component_diffs"]:
            self.assertIn(d["change_type"], ["ADDED", "REMOVED", "MODIFIED"])
            self.assertGreater(len(d["details"]), 0)

    def test_consistency_checks_and_human_review_lifecycle(self):
        """Verifies consistency rule execution, severity allocation, and engineer review persistence."""
        response = client.get("/analysis/consistency")
        self.assertEqual(response.status_code, 200)
        findings = response.json()
        self.assertGreaterEqual(len(findings), 4)

        for f in findings:
            self.assertIn(f["severity"], ["HIGH", "MEDIUM", "LOW"])
            self.assertTrue(f["rule_id"].startswith("RULE-"))
            self.assertGreater(len(f["suggested_action"]), 0)
            self.assertGreater(f["source_evidence"]["page_number"], 0)

        target_finding = findings[0]
        finding_id = target_finding["id"]

        rev_payload = {
            "status": "ACCEPTED",
            "engineer_comments": "Verified in ASIL-D safety audit; MPU isolation barrier confirmed.",
            "reviewed_by": "Senior_Safety_Engineer_442"
        }
        rev_resp = client.post(f"/reviews/{finding_id}", json=rev_payload)
        self.assertEqual(rev_resp.status_code, 200)
        updated_finding = rev_resp.json()
        self.assertEqual(updated_finding["review_status"], "ACCEPTED")
        self.assertEqual(updated_finding["engineer_comments"], rev_payload["engineer_comments"])
        self.assertEqual(updated_finding["reviewed_by"], rev_payload["reviewed_by"])

        sum_resp = client.get("/reviews/summary")
        self.assertEqual(sum_resp.status_code, 200)
        summary = sum_resp.json()
        self.assertGreaterEqual(summary["total_findings"], 4)
        self.assertGreaterEqual(summary["accepted_count"], 1)
        self.assertGreaterEqual(summary["high_severity_count"], 1)

        finding_id_2 = findings[1]["id"]
        rej_payload = {
            "status": "REJECTED",
            "engineer_comments": "Dangling port resolved in Section 3.2 errata.",
            "reviewed_by": "Senior_Safety_Engineer_442"
        }
        rej_resp = client.post(f"/reviews/{finding_id_2}", json=rej_payload)
        self.assertEqual(rej_resp.status_code, 200)
        self.assertEqual(rej_resp.json()["review_status"], "REJECTED")

    def test_expanded_evaluation_benchmark_dataset(self):
        """Verifies that the expanded benchmark contains 25 questions with answerable and negative constraint items."""
        questions = evaluator.load_questions()
        self.assertEqual(len(questions), 25)

        negative_questions = [q for q in questions if q.target_page == 0 or "negative" in q.category.lower()]
        answerable_questions = [q for q in questions if q.target_page > 0 and "negative" not in q.category.lower()]

        self.assertGreaterEqual(len(answerable_questions), 15)
        self.assertGreaterEqual(len(negative_questions), 5)

        tc09 = next(q for q in questions if q.id == "TC-09")
        self.assertEqual(tc09.target_page, 0)
        self.assertIn("not contain sufficient", tc09.expected_answer.lower())

        tc01 = next(q for q in questions if q.id == "TC-01")
        self.assertEqual(tc01.target_page, 42)
        self.assertIn("PowertrainCoordination_SWC", tc01.keywords)

    def test_export_endpoints(self):
        """Verifies that GET /export/architecture and /export/findings return valid JSON and CSV formats."""
        res_arch_json = client.get("/export/architecture?format=json")
        self.assertEqual(res_arch_json.status_code, 200)
        data_json = json.loads(res_arch_json.text)
        self.assertIn("components", data_json)
        self.assertGreaterEqual(len(data_json["components"]), 5)

        res_arch_csv = client.get("/export/architecture?format=csv")
        self.assertEqual(res_arch_csv.status_code, 200)
        csv_text = res_arch_csv.text
        self.assertIn("SOFTWARE COMPONENTS", csv_text)
        self.assertIn("PowertrainCoordination_SWC", csv_text)
        self.assertIn("RTE INTERFACES", csv_text)

        res_find_json = client.get("/export/findings?format=json")
        self.assertEqual(res_find_json.status_code, 200)
        findings_data = json.loads(res_find_json.text)
        self.assertIsInstance(findings_data, list)
        self.assertGreaterEqual(len(findings_data), 4)

        res_find_csv = client.get("/export/findings?format=csv")
        self.assertEqual(res_find_csv.status_code, 200)
        self.assertIn("Finding ID,Rule Code,Severity", res_find_csv.text)


if __name__ == "__main__":
    unittest.main()
