# High-Level Design Specification: ECU Central Gateway (Zonal Architecture)
**Document ID:** HLD-ECU-GW-2026-v2.4  
**Classification:** OEM Synthetic Engineering Study  
**Standard:** AUTOSAR Classic Release 4.4  
**Safety Target:** ISO 26262 ASIL-B / ASIL-D Mixed Criticality  

---

## Section 1: Executive Scope & System Context
The Central Zonal Gateway acts as the primary communication and security boundary between the vehicle high-speed drivetrain CAN-FD networks, comfort LIN sub-busses, and Ethernet backbones. It manages routing between heterogeneous sub-networks and hosts critical basic software (BSW) stacks.

---

## Section 2: Functional Safety Invariants & ASIL Decomposition
### 2.4 Safety Goals & ASIL Decomposition
- **Safety Goal SG-01:** Prevent unintended regenerative deceleration exceeding 0.3g during high-speed cruising.
- **Allocation:** Allocated to `PowertrainCoordination_SWC` with an `ASIL-D` functional safety rating under ISO 26262.
- **Redundancy:** Requires dual-channel sensor verification via RPort `SR_BrakePedalTravel`. Plausibility failure forces transition to safe state within 20 milliseconds (Fault Reaction Time Limit - FRTL).

---

## Section 3: Run-Time Environment (RTE) Port Mappings
### 3.1 Sender-Receiver Ports & Diagnostics
Software components interact through standardized AUTOSAR Port Interfaces. Interfaces `SR_TorqueRequest` and `SR_VehicleSpeed` are mapped to non-queued RTE data elements. Unhandled communication timeouts generate Event ID `Dem_Event_CAN_BusOff` handled by the Diagnostic Event Manager (`Dem_BSW_Module`).

### 3.2 Software Component Allocation & Ports
Application components are scheduled deterministically:
1. `PowertrainCoordination_SWC` (Application SW-C, ASIL-D, 10ms cycle)
2. `Gateway_Router_SWC` (Service SW-C, ASIL-B, 5ms cycle)
3. `BodyControl_SWC` (Sensor-Actuator SW-C, QM, 20ms cycle)
4. `Dem_BSW_Module` (Diagnostic BSW Module, ASIL-B, Event-driven)

Inter-ECU signals are routed through the PDU Router (`PduR`) basic software module to the CAN Interface (`CanIf`).

---

## Section 4: Bus Matrix & Communication Routing
### 4.2 CAN-FD Bus Matrix & SW-C Allocation
The Central Gateway allocates CAN-FD Channel 0 for high-priority drivetrain traffic:
- **Nominal Bitrate:** 500 kbps (Arbitration Phase)
- **Data Bitrate:** 2.0 Mbps (Payload Phase)
- **Payload Capacity:** 64 bytes per frame
- **Transceiver:** Split termination with 120-ohm resistors.

Software components `PowertrainCoordination_SWC` and `BodyControl_SWC` interact through RTE PPorts bound to Signal PDUs (`PDU_TorqueReq_0x120` and `PDU_SpeedEstimate_0x240`).

---

## Section 5: Diagnostic Basic Software (BSW) Services
### 5.1 Dem Module Architecture & DTC Debouncing
Diagnostic event reporting is centralized within the Diagnostic Event Manager (`Dem_BSW_Module`). SW-Cs invoke Client-Server interface `CS_DiagRoutine_Service` exposing:
- `StartRoutine(uint16 routine_id)`
- `StopRoutine(uint16 routine_id)`
- `RequestResults() -> status`

Debouncing counters record fault persistence over 3 ignition cycles before committing non-volatile Diagnostic Trouble Codes (DTCs).
