import { DocumentPage } from '../utils/chunker';

export const SAMPLE_AUTOSAR_PAGES: Record<string, DocumentPage[]> = {
  "doc-gw-01": [
    {
      page_number: 1,
      text: `ECU CENTRAL GATEWAY HIGH-LEVEL DESIGN SPECIFICATION
Document Identifier: AUTOSAR-HLD-GW-2026-v2.4
Standard: AUTOSAR Classic Release 4.4.0
Safety Classification: ISO 26262 ASIL-B / QM Mix

1.0 Executive Architecture Overview
The Central Gateway ECU serves as the multi-bus backbone interconnect for the vehicle E/E architecture. It facilitates deterministic communication routing between high-speed CAN-FD domain segments, automotive Ethernet (100BASE-T1), and local LIN sub-busses.

The internal software architecture adheres strictly to AUTOSAR Classic Layered Architecture, comprising the Application Software Layer (SW-C), the Run-Time Environment (RTE), and the Basic Software (BSW).`
    },
    {
      page_number: 2,
      text: `2.0 Basic Software (BSW) Stack & Bus Interface Allocation
The BSW communication cluster consists of the CAN Driver (Can), CAN Interface (CanIf), PDU Router (PduR), and Network Management (CanNm).

2.1 Hardware Mailbox Configuration
The microcontroller CAN-FD controller provides 64 dedicated message buffers. Mailboxes 0 through 7 are statically assigned to CAN-FD Channel 0 (Drivetrain bus).
Mailboxes 8 through 15 are assigned to CAN-FD Channel 1 (Body and Comfort bus).

| Channel | Bus Speed | Payload Size | Transceiver Termination |
| CAN-FD 0 | 500k / 2.0M | 64 Bytes | 120 Ohm Split |
| CAN-FD 1 | 500k / 2.0M | 64 Bytes | 120 Ohm Split |
| LIN 0 | 19.2 kbps | 8 Bytes | Master 1k Ohm |`
    },
    {
      page_number: 3,
      text: `3.0 Software Component (SW-C) Architecture & Port Bindings
The Central Gateway application consists of two primary SW-Cs:
1. Gateway_Router_SWC: Handles inter-domain signal routing and gateway lookups.
2. Gateway_Diag_SWC: Handles centralized diagnostic proxying and UDS routing via ISO 14229.

3.1 Port Interfaces and RTE Contracts
The Gateway_Router_SWC defines the following communication contracts:
- Port R_TorqueGateway (Receiver): Bound to Sender-Receiver interface SR_TorqueRequest.
- Port P_CanFdBroadcast (Provider): Bound to Sender-Receiver interface SR_VehicleSpeed.
- Port PR_DiagServicePort: Client-Server interface for Dem diagnostic event reporting.

All non-queued signals use atomic 32-bit shadow buffers in the RTE to ensure multi-core data consistency without spinlocks.`
    },
    {
      page_number: 4,
      text: `4.0 Functional Safety & Fault Management (ISO 26262)
4.1 ASIL Allocation
The routing of safety-critical powertrain torque commands through the Gateway is assigned ASIL-B. To prevent single-point communication failure:
1. End-to-End (E2E) Profile 4 protection is applied to all safety-relevant PDUs.
2. A CRC-16 polynomial (0x1021) and a 4-bit alive counter are evaluated per frame.

4.2 Fault Reaction & Safe-State Invariants
If three consecutive E2E CRC check failures are detected, the PduR module transitions the signal into its predefined Init/Substitute value and triggers the Diagnostic Event Manager (Dem) DTC 0xD10411.`
    }
  ],
  "doc-pt-02": [
    {
      page_number: 1,
      text: `POWERTRAIN COORDINATION SW-C SPECIFICATION
Document ID: HLD-SWC-PTC-2026-v1.8
Target ECU: Powertrain Domain Controller
Safety Target: ISO 26262 ASIL-D

1.0 Functional Requirements
The PowertrainCoordination_SWC calculates master torque arbitration across traction motors and mechanical friction braking.

Execution Periodicity: 10 milliseconds cyclic task (Task_PT_10ms).
Processor Core: Core 0 (Lockstep Cortex-R52).`
    },
    {
      page_number: 2,
      text: `2.0 Safety Goals & ASIL-D Decomposition
Safety Goal SG-01: Prevent unintended motor acceleration exceeding 0.2g for longer than 40ms.
ASIL Level: ASIL-D.

Decomposition:
- Channel A (Primary): Complex torque calculation algorithm based on driver pedal angle.
- Channel B (Independent Plausibility Monitor): Independent inverse check comparing requested torque against vehicle speed and brake pressure.
If discrepancy > 5%, initiate immediate motor cutoff via emergency power stage disconnect.`
    }
  ]
};
