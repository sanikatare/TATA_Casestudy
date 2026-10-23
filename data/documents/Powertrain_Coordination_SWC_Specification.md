# Software Component Specification: Powertrain Coordination SW-C
**Document ID:** HLD-SWC-PTC-2026-v1.8  
**Target ECU:** Powertrain Domain Controller  
**Safety Target:** ISO 26262 ASIL-D  
**Standard:** AUTOSAR Classic Release 4.4  

---

## Section 1: Functional Scope & Execution Context
The `PowertrainCoordination_SWC` calculates master longitudinal torque arbitration across high-voltage traction inverters and mechanical friction braking systems.

---

## Section 2: Functional Safety Invariants & ASIL-D Decomposition
### 2.4 Safety Goals & ASIL Decomposition
- **Safety Goal SG-01:** Prevent unintended motor acceleration or regenerative deceleration exceeding 0.2g for longer than 40ms.
- **Integrity Level:** Regenerative torque arbitration is hosted in `PowertrainCoordination_SWC` and rated ASIL-D under ISO 26262 Part 4 and Part 6.
- **Decomposition:**
  - Channel A (Primary): Driver acceleration pedal position calculation.
  - Channel B (Secondary Plausibility): Independent plausibility monitor comparing torque request against wheel speed sensor inputs.
- **Memory Partitioning:** Memory isolation between ASIL-D safety partitions and QM partitions is enforced by the hardware Memory Protection Unit (MPU) configured via AUTOSAR OS-Applications.

### 2.7 Fault Detection and Safe State Invariants
- **Fault Reaction Time Limit (FRTL):** The Fault Reaction Time Limit (FRTL) is 20 milliseconds to transition the traction motor into passive safe-state upon sensor divergence.

---

## Section 3: RTE Port Interfaces & Component Allocation
### 3.1 Provided Ports (PPorts)
- `P_TorqueCoordination`: Provides arbitrated drive torque demand to the Inverter Driver.
- `P_MotorTorqueCommand`: Provides torque limit command bound to `SR_TorqueRequest`.

### 3.2 Required Ports (RPorts)
- `R_BrakePedalTravel`: Dual-channel analog brake travel sensor telemetry.
- `R_VehicleSpeedSense`: Consumes vehicle speed estimate via `SR_VehicleSpeed`.

### 3.5 Component Memory & Task Partitioning
`PowertrainCoordination_SWC` executes cyclically every 10ms bound to AUTOSAR OS `Task_10ms_Core0` in lockstep Cortex-R52 Core 0. `BswM` (Basic Software Mode Manager) coordinates vehicle run-modes, startup sequence initialization, and sleep transitions across multi-core partitions.
