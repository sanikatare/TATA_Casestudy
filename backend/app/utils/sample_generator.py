from pathlib import Path
from typing import Optional
import pymupdf as fitz

from backend.app.utils.logging import logger


def generate_sample_autosar_hld_pdf(output_path: str | Path) -> Path:
    """
    Generates a realistic 4-page AUTOSAR High-Level Design (HLD) PDF
    with chapters, component descriptions, interface tables, and BSW mappings.
    """
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    doc = fitz.open()

    # --- PAGE 1: Title & Scope ---
    page1 = doc.new_page(width=595, height=842)  # A4 size
    # Header banner
    page1.draw_rect(fitz.Rect(40, 40, 555, 90), color=(0.04, 0.12, 0.25), fill=(0.04, 0.12, 0.25))
    page1.insert_text((55, 65), "AUTOSAR HIGH-LEVEL DESIGN (HLD) SPECIFICATION", fontsize=14, color=(1, 1, 1))
    page1.insert_text((55, 80), "Powertrain & Gateway Electronic Control Unit (ECU) Architecture v4.4.0", fontsize=9, color=(0.8, 0.9, 1))

    # Chapter 1
    page1.insert_text((50, 130), "Chapter 1: Scope and System Architecture", fontsize=14, color=(0.05, 0.2, 0.4))
    page1.insert_text((50, 155), "1.1 System Architecture Overview", fontsize=11, color=(0.1, 0.1, 0.1))
    
    p1_body = (
        "This specification establishes the software architecture for the high-performance Electronic Control Unit (ECU) "
        "operating within the vehicle powertrain domain. The architecture strictly adheres to AUTOSAR Classic Platform Release 4.4.0. "
        "The system coordinates internal combustion and hybrid electric torque management, communicates with transmission modules "
        "over High-Speed CAN-FD (5 Mbps), and bridges diagnostic telemetry to the Central Gateway via Automotive Ethernet.\n\n"
        "1.2 Compliance and Safety Integrity Level (ASIL)\n"
        "All software components within this ECU are categorized under ISO 26262 functional safety requirements. "
        "The torque control loop is allocated to ASIL-D safety integrity, while diagnostic reporting is designated ASIL-B. "
        "Memory partitioning between safety-critical and standard partitions is enforced via the Hardware Protection Unit (MPU)."
    )
    rect1 = fitz.Rect(50, 175, 545, 380)
    page1.insert_textbox(rect1, p1_body, fontsize=10, color=(0.15, 0.15, 0.15), lineheight=1.4)

    page1.insert_text((50, 420), "1.3 Document Traceability & Revisions", fontsize=11, color=(0.1, 0.1, 0.1))
    p1_trace = (
        "Document Identifier: HLD-PCM-2026-AUTOSAR-REV4\n"
        "Author: Powertrain Systems Software Group\n"
        "Security Classification: Confidential / OEM Internal Engineering\n"
        "Standard Target: AUTOSAR Classic R4.4.0 / Adaptive Bridge v20-11"
    )
    page1.insert_textbox(fitz.Rect(50, 435, 545, 520), p1_trace, fontsize=9, color=(0.3, 0.3, 0.3), lineheight=1.4)
    page1.insert_text((50, 800), "Page 1 | AUTOSAR HLD Specification - Powertrain Domain", fontsize=8, color=(0.5, 0.5, 0.5))

    # --- PAGE 2: Software Components Architecture ---
    page2 = doc.new_page(width=595, height=842)
    page2.insert_text((50, 60), "Chapter 2: Software Components (SW-C) Architecture", fontsize=14, color=(0.05, 0.2, 0.4))
    
    p2_body = (
        "2.1 Application Software Component Hierarchy\n"
        "The application layer comprises modular Software Components (SW-Cs) that execute independently of the underlying "
        "microcontroller hardware through the Virtual Function Bus (VFB) abstraction.\n\n"
        "1. EngineControl_SWC (Application SW-C):\n"
        "   - Primary responsibility: Calculates target engine torque and controls throttle valve actuation.\n"
        "   - Cyclic execution period: 10 ms periodic runnable (Runnable_TorqueLoop).\n"
        "   - Safety Level: ASIL-D certified.\n\n"
        "2. TransmissionManager_SWC (Application SW-C):\n"
        "   - Primary responsibility: Monitors gear engagement, computes shift advisories, and synchronizes clutch speed.\n"
        "   - Cyclic execution period: 20 ms periodic runnable (Runnable_ShiftCoordination).\n\n"
        "3. GatewayRouter_SWC (Complex Device Driver / Service SW-C):\n"
        "   - Primary responsibility: Bridges signal translation between High-Speed CAN, LIN sub-bus, and Ethernet frames.\n"
        "   - Inter-bus translation latency: Guaranteed under 2.5 milliseconds.\n\n"
        "4. DiagnosticsManager_SWC (Service SW-C):\n"
        "   - Primary responsibility: Implements ISO 14229 Unified Diagnostic Services (UDS) and manages Diagnostic Trouble Codes (DTCs).\n"
        "   - Interfaces with BSW Dem (Diagnostic Event Manager) and Dcm (Diagnostic Communication Manager)."
    )
    rect2 = fitz.Rect(50, 85, 545, 600)
    page2.insert_textbox(rect2, p2_body, fontsize=10, color=(0.15, 0.15, 0.15), lineheight=1.4)
    page2.insert_text((50, 800), "Page 2 | AUTOSAR HLD Specification - Software Components", fontsize=8, color=(0.5, 0.5, 0.5))

    # --- PAGE 3: Communication Interfaces & Port Definitions ---
    page3 = doc.new_page(width=595, height=842)
    page3.insert_text((50, 60), "Chapter 3: Communication Interfaces & Port Definitions", fontsize=14, color=(0.05, 0.2, 0.4))
    
    p3_intro = (
        "3.1 Port Interface Formal Definitions\n"
        "Communication between SW-Cs and the Basic Software (BSW) is conducted strictly through standardized AUTOSAR Ports. "
        "The following table specifies the interface contracts, port prototypes, and mapped signals."
    )
    page3.insert_textbox(fitz.Rect(50, 85, 545, 140), p3_intro, fontsize=10, color=(0.15, 0.15, 0.15), lineheight=1.3)

    # Draw Interface Table
    table_top = 150
    col_x = [50, 160, 240, 360, 450, 545]
    row_h = 24
    headers = ["Port Prototype", "Direction", "Interface Name", "Pattern", "Target Unit"]
    
    # Header row background
    page3.draw_rect(fitz.Rect(col_x[0], table_top, col_x[-1], table_top + row_h), color=(0.2, 0.3, 0.5), fill=(0.15, 0.25, 0.45))
    for c_i, header in enumerate(headers):
        page3.insert_text((col_x[c_i] + 4, table_top + 16), header, fontsize=9, color=(1, 1, 1))

    # Table rows
    table_rows = [
        ("EngineTorque_PPort", "PPort (Provided)", "If_EngineTorque", "Sender-Receiver", "TransmissionSWC"),
        ("VehicleSpeed_RPort", "RPort (Required)", "If_VehicleSpeed", "Sender-Receiver", "GatewayRouter"),
        ("Diagnostics_PPort", "PPort (Provided)", "If_UDSService", "Client-Server", "DiagManagerSWC"),
        ("CanRawFrame_RPort", "RPort (Required)", "If_CANMessage", "Sender-Receiver", "CanIf_BSW"),
        ("NvmBlock_Eng_PRPort", "PRPort (Dual)", "If_NvMStorage", "Client-Server", "NvM_BSW"),
        ("BrakePedal_RPort", "RPort (Required)", "If_BrakeStatus", "Sender-Receiver", "ChassisGateway"),
    ]

    for r_idx, row in enumerate(table_rows):
        cur_y = table_top + (r_idx + 1) * row_h
        bg_col = (0.95, 0.97, 1.0) if r_idx % 2 == 0 else (1.0, 1.0, 1.0)
        page3.draw_rect(fitz.Rect(col_x[0], cur_y, col_x[-1], cur_y + row_h), color=(0.8, 0.85, 0.9), fill=bg_col)
        for c_idx, cell in enumerate(row):
            page3.insert_text((col_x[c_idx] + 4, cur_y + 16), cell, fontsize=8, color=(0.1, 0.1, 0.1))

    # Bottom notes
    p3_notes = (
        "3.2 Interface Semantics & Signal Packaging\n"
        "- If_EngineTorque payload: ActualTorque (int16), TargetTorque (int16), FrictionTorque (int16), TorqueStatus (uint8).\n"
        "- If_VehicleSpeed payload: WheelSpeed_FL, WheelSpeed_FR, VehicleRefSpeed (float32, resolution 0.05 km/h).\n"
        "- Data Integrity: All Sender-Receiver communication crossing ECU partitions utilizes End-to-End (E2E) Profile 4 protection."
    )
    page3.insert_textbox(fitz.Rect(50, 360, 545, 520), p3_notes, fontsize=10, color=(0.15, 0.15, 0.15), lineheight=1.4)
    page3.insert_text((50, 800), "Page 3 | AUTOSAR HLD Specification - Interface Tables", fontsize=8, color=(0.5, 0.5, 0.5))

    # --- PAGE 4: BSW and RTE Mapping ---
    page4 = doc.new_page(width=595, height=842)
    page4.insert_text((50, 60), "Chapter 4: BSW and RTE Mapping", fontsize=14, color=(0.05, 0.2, 0.4))

    p4_body = (
        "4.1 Runtime Environment (RTE) Generation\n"
        "The RTE acts as the runtime glue binding SW-Cs to each other and to the Basic Software (BSW). "
        "RTE API generation uses the Contract Phase and Build Phase workflow per AUTOSAR Methodology. "
        "Inter-runnable communication within the same partition uses Direct Function Calls, while cross-partition "
        "communication is mediated by the OS Task Queues.\n\n"
        "4.2 Basic Software (BSW) Module Allocation\n"
        "- Com (Communication Module): Manages I-PDU packaging and signal extraction for CAN-FD.\n"
        "- CanIf (CAN Interface): Handles CAN hardware controller abstraction (Bosch M_CAN IP).\n"
        "- Dem (Diagnostic Event Manager): Tracks 256 unique DTCs and stores freeze-frame fault records.\n"
        "- NvM (Non-Volatile Memory Manager): Allocates EEPROM blocks for calibration and adaptation values.\n"
        "- WdgM (Watchdog Manager): Supervizes alive counter, deadline, and logical program flow monitoring.\n\n"
        "4.3 Memory Mapping and ASIL Partitioning\n"
        "Section .sec_asil_d is memory-protected and dedicated exclusively to EngineControl_SWC. "
        "Any unauthorized write attempt from non-safety partitions triggers an immediate OS HardFault Exception "
        "and commands safe torque ramp-down to limp-home mode."
    )
    page4.insert_textbox(fitz.Rect(50, 85, 545, 620), p4_body, fontsize=10, color=(0.15, 0.15, 0.15), lineheight=1.4)
    page4.insert_text((50, 800), "Page 4 | AUTOSAR HLD Specification - BSW & RTE Mapping", fontsize=8, color=(0.5, 0.5, 0.5))

    doc.save(str(path))
    doc.close()

    logger.info(f"Generated sample AUTOSAR HLD specification at: {path}")
    return path
