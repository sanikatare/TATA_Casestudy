#!/usr/bin/env python3
"""
Sample PDF Generator for AUTOSAR HLD Ingestion Testing.
Generates valid multi-page binary PDF files using pure Python (no external dependencies required):
1. sample_autosar_hld.pdf: Valid 3-page AUTOSAR HLD with sections, SW-Cs, and port specs.
2. empty_scanned_sample.pdf: A 2-page PDF containing no extractable text layer to test error handling.
"""

from pathlib import Path


def create_minimal_pdf(pages_text: list[str], output_path: Path) -> None:
    """
    Generates a valid PDF 1.4 binary file with the provided page text contents.
    Uses standard Helvetica font and decompressed PDF content streams.
    """
    objects = []
    
    # 1. Catalog Object
    objects.append(b"<< /Type /Catalog /Pages 2 0 R >>")
    
    # 2. Pages Parent (placeholder, updated below)
    page_count = len(pages_text)
    page_refs = " ".join(f"{3 + i*2} 0 R" for i in range(page_count))
    objects.append(f"<< /Type /Pages /Kids [{page_refs}] /Count {page_count} >>".encode("latin1"))

    # Add Page & Content Objects
    for i, text in enumerate(pages_text):
        content_obj_id = 4 + i * 2
        # Page Object (3, 5, 7, ...)
        page_dict = f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents {content_obj_id} 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>"
        objects.append(page_dict.encode("latin1"))

        # Format Text Stream with line breaks
        stream_lines = ["BT", "/F1 12 Tf", "50 720 Td", "16 TL"]
        for line in text.split("\n"):
            escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            stream_lines.append(f"({escaped}) '")
        stream_lines.append("ET")
        stream_content = "\n".join(stream_lines).encode("latin1")

        # Content Object (4, 6, 8, ...)
        content_dict = f"<< /Length {len(stream_content)} >>\nstream\n".encode("latin1") + stream_content + b"\nendstream"
        objects.append(content_dict)

    # Build PDF with xref table
    output = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    xref_offsets = [0]

    for i, obj in enumerate(objects, start=1):
        xref_offsets.append(len(output))
        output.extend(f"{i} 0 obj\n".encode("latin1"))
        output.extend(obj)
        output.extend(b"\nendobj\n")

    xref_start = len(output)
    output.extend(f"xref\n0 {len(objects) + 1}\n".encode("latin1"))
    output.extend(b"0000000000 65535 f \n")
    for offset in xref_offsets[1:]:
        output.extend(f"{offset:010d} 00000 n \n".encode("latin1"))

    output.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_start}\n%%EOF\n".encode("latin1")
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(output)
    print(f"Generated test PDF: {output_path} ({len(output)} bytes, {page_count} pages)")


def main():
    target_dir = Path("./data/documents")
    
    # 1. Valid AUTOSAR HLD Specification (3 pages)
    page1 = """Section 1: Central Zonal Gateway Architecture Overview
The Central Zonal Gateway manages communication between vehicle drivetrain CAN-FD networks and Ethernet.
Software Components:
- PowertrainCoordination_SWC (Application SW-C, ASIL-D, 10ms execution period)
- Gateway_Router_SWC (Service Component, ASIL-B, 5ms execution period)
- BodyControl_SWC (Sensor-Actuator SW-C, QM, 20ms execution period)
- Dem_BSW_Module (Diagnostic BSW Module, ASIL-B, Event-driven)"""

    page2 = """Section 4: CAN-FD Bus Matrix and PDU Routing
The Central Gateway allocates CAN-FD Channel 0 for high-priority drivetrain traffic.
Specifications:
- Nominal Bitrate: 500 kbps (Arbitration Phase)
- Data Bitrate: 2.0 Mbps (Payload Phase)
- Payload Size: 64 bytes per frame
Interfaces:
- SR_TorqueRequest: Non-queued Sender-Receiver interface mapped to PDU_TorqueReq_0x120
- SR_VehicleSpeed: WheelSpeed_kph mapped to PDU_SpeedEstimate_0x240"""

    page3 = """Section 5: Diagnostic Basic Software and Fault Handling
Diagnostic event reporting is managed by the Diagnostic Event Manager (Dem).
Client-Server interface CS_DiagRoutine_Service provides:
- StartRoutine(uint16 routine_id)
- StopRoutine(uint16 routine_id)
- RequestResults()
Unhandled communication timeouts generate Event ID Dem_Event_CAN_BusOff."""

    create_minimal_pdf([page1, page2, page3], target_dir / "sample_autosar_hld.pdf")

    # 2. Empty / Scanned PDF (contains no text)
    create_minimal_pdf(["", "   "], target_dir / "scanned_empty_sample.pdf")


if __name__ == "__main__":
    main()
