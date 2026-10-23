# High-Level Design Specification: Clean Battery Management System (BMS)
**Document ID:** HLD-BMS-2026-v1.0  
**Target ECU:** BMS Domain Controller  
**Safety Target:** ISO 26262 ASIL-C Homogeneous  
**Standard:** AUTOSAR Classic Release 4.4  

---

## Section 1: Executive Scope & System Context
The `BMS_Master_SWC` coordinates cell voltage balancing and pack contactor sequencing with homogeneous ASIL-C safety integrity.

### 1.1 Components & Allocation
1. `BMS_Master_SWC` (Application SW-C, ASIL-C, 10ms cycle)
2. `BMS_CellMonitor_SWC` (Sensor-Actuator SW-C, ASIL-C, 10ms cycle)

Both components reside in the same ASIL-C safety partition with identical 10ms execution cycles.

---

## Section 2: Port Interfaces & RTE Bindings
### 2.1 Interface Contracts
- `SR_CellVoltages`: Sender-Receiver interface provided by `BMS_CellMonitor_SWC` and consumed by `BMS_Master_SWC`. Data elements: `MinVoltage_mV (uint16)`, `MaxVoltage_mV (uint16)`. Both producer and consumer execute at matching 10ms rates.
- `SR_ContactorCommand`: Sender-Receiver interface provided by `BMS_Master_SWC` and consumed by `BMS_CellMonitor_SWC`. Data elements: `ContactorState (enum)`. Both producer and consumer execute at matching 10ms rates.

All required ports have defined providers, with homogeneous ASIL-C allocation and synchronized 10ms execution periodicity.
