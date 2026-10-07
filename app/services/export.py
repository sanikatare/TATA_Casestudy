import csv
import io
import json
from typing import Dict, Any, Optional
from app.services.architecture import architecture_service
from app.services.review import review_service


class ExportService:
    """
    Exports structured AUTOSAR architecture specifications, consistency findings,
    and engineering review audits as standardized JSON or CSV formats.
    """

    def export_architecture_json(self, document_id: Optional[str] = None) -> str:
        arch = architecture_service.analyze_document(document_id)
        return arch.model_dump_json(indent=2)

    def export_architecture_csv(self, document_id: Optional[str] = None) -> str:
        arch = architecture_service.analyze_document(document_id)
        output = io.StringIO()
        writer = csv.writer(output)

        # Section 1: Components
        writer.writerow(["=== SOFTWARE COMPONENTS (SW-Cs) ==="])
        writer.writerow(["Name", "Type", "ASIL Level", "ECU Allocation", "Periodicity", "Memory Partition", "Page", "Section", "Evidence"])
        for c in arch.components:
            writer.writerow([
                c.name, c.component_type, c.asil_level, c.ecu_allocation, c.periodicity,
                c.memory_partition, c.source_evidence.page_number, c.source_evidence.section, c.source_evidence.snippet
            ])

        writer.writerow([])
        # Section 2: RTE Interfaces
        writer.writerow(["=== RTE INTERFACES ==="])
        writer.writerow(["Interface Name", "Kind", "Provider SW-C", "Consumer SW-Cs", "Data Elements", "Page", "Section"])
        for i in arch.interfaces:
            writer.writerow([
                i.name, i.interface_kind, i.provider_swc or "N/A", "; ".join(i.consumer_swcs),
                "; ".join(i.data_elements), i.source_evidence.page_number, i.source_evidence.section
            ])

        writer.writerow([])
        # Section 3: Bus Matrix
        writer.writerow(["=== BUS MATRIX ==="])
        writer.writerow(["Channel Name", "Protocol", "Nominal Bitrate", "Data Bitrate", "Payload (Bytes)", "Attached ECUs", "Page", "Section"])
        for b in arch.bus_matrix:
            writer.writerow([
                b.channel_name, b.protocol, b.nominal_bitrate, b.data_bitrate or "N/A",
                b.max_payload_bytes, "; ".join(b.attached_ecus), b.source_evidence.page_number, b.source_evidence.section
            ])

        return output.getvalue()

    def export_findings_json(self, document_id: Optional[str] = None) -> str:
        findings = review_service.get_findings_with_reviews(document_id)
        findings_dict = [f.model_dump() for f in findings]
        return json.dumps(findings_dict, indent=2)

    def export_findings_csv(self, document_id: Optional[str] = None) -> str:
        findings = review_service.get_findings_with_reviews(document_id)
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow([
            "Finding ID", "Rule Code", "Severity", "Category", "Title",
            "Affected Entity", "Page", "Section", "Evidence Snippet",
            "Suggested Action", "Review Status", "Engineer Comments", "Reviewed By", "Reviewed At"
        ])

        for f in findings:
            writer.writerow([
                f.id, f.rule_id, f.severity, f.category, f.title,
                f.entity_affected, f.source_evidence.page_number, f.source_evidence.section,
                f.source_evidence.snippet, f.suggested_action, f.review_status,
                f.engineer_comments, f.reviewed_by or "N/A", f.reviewed_at or "N/A"
            ])

        return output.getvalue()


export_service = ExportService()
