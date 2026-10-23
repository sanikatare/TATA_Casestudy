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
- **Memory Partitioning:** Hardware Memory Protection Unit (MPU) enforces physical memory isolation between ASIL-D safety partitions and QM partitions configured via AUTOSAR OS-Applications.

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
5. `CanIf_Driver` (Communication Hardware Driver, ASIL-B, 1ms cycle)

- **PDU Routing:** Inter-ECU signals are routed through the PDU Router (`PduR`) basic software module to the CAN Interface (`CanIf`). PduR translates and routes I-PDUs between CanIf and RTE.
- **Hardware Mailbox Abstraction:** The `CanIf_Driver` executes at 1ms periodicity, abstracting CAN controller hardware mailboxes and servicing communication interrupts.
- **Dangling Requirement Port:** `Gateway_Router_SWC` declares requirement port `R_InverterCurrent` to bridge traction power telemetry, but no `Inverter_Actuator_SWC` provider is allocated in the local High-Level Design component catalog.

### 3.5 Component Memory & Task Partitioning
`BswM` (Basic Software Mode Manager) coordinates vehicle run-modes, startup sequence initialization, and sleep transitions across multi-core partitions.

---

## Section 4: Bus Matrix & Communication Routing
### 4.2 CAN-FD Bus Matrix & SW-C Allocation
The Central Gateway allocates CAN-FD Channel 0 for high-priority drivetrain traffic:
- **Nominal Bitrate:** 500 kbps (Arbitration Phase)
- **Data Bitrate:** 2.0 Mbps (Payload Phase)
- **Payload Capacity:** 64 bytes per frame
- **Transceiver:** Split termination with 120-ohm resistors.

Software components `PowertrainCoordination_SWC` and `BodyControl_SWC` communicate with `Gateway_Router_SWC` over CAN-FD Channel 0 bound to Signal PDUs (`PDU_TorqueReq_0x120` and `PDU_SpeedEstimate_0x240`). `BodyControl_SWC` broadcasts wheel speed cyclically every 20ms across CAN-FD Channel 0 via `SR_VehicleSpeed` to `PowertrainCoordination_SWC`.

### 4.5 Automotive Ethernet Backbone Architecture
Automotive Ethernet Eth0 utilizes `100BASE-T1` BroadR-Reach single twisted-pair physical layer operating at 100 Mbps. Diagnostics over IP (`DoIP`) conforming to ISO 13400 is utilized for diagnostic communication over Ethernet port 13400.

---

## Section 5: Diagnostic Basic Software (BSW) Services
### 5.1 Dem Module Architecture & DTC Debouncing
Diagnostic event reporting is centralized within the Diagnostic Event Manager (`Dem_BSW_Module`). SW-Cs invoke Client-Server interface `CS_DiagRoutine_Service` exposing:
- `StartRoutine(uint16 routine_id)`
- `StopRoutine(uint16 routine_id)`
- `RequestResults() -> status`

Debouncing counters record fault persistence using counter-based and time-based debouncing algorithms over 3 ignition cycles before committing non-volatile Diagnostic Trouble Codes (DTCs).

### 5.3 UDS Diagnostic Services
Dem implements Client-Server diagnostic interface `CS_DiagRoutine_Service` providing routine start, stop, and status querying.
