import React from 'react';
import { ArchitectureGraph } from '../components/ArchitectureGraph';
import { SoftwareComponent, PortInterface } from '../types/autosar';

const SAMPLE_COMPONENTS: SoftwareComponent[] = [
  {
    name: 'PowertrainCoordination_SWC',
    type: 'Application SW-C',
    ecu: 'Powertrain DC',
    asil: 'ASIL-D',
    periodicity: '10ms',
    ports: ['P_TorqueCoordination', 'R_BrakePedalTravel', 'R_VehicleSpeedSense', 'P_MotorTorqueCommand']
  },
  {
    name: 'Gateway_Router_SWC',
    type: 'Service Component',
    ecu: 'Central Gateway',
    asil: 'ASIL-B',
    periodicity: '5ms',
    ports: ['R_TorqueGateway', 'P_CanFdBroadcast', 'R_LinBodyFrame', 'PR_DiagServicePort']
  },
  {
    name: 'BodyControl_SWC',
    type: 'Sensor-Actuator SW-C',
    ecu: 'Body Zonal Controller',
    asil: 'QM',
    periodicity: '20ms',
    ports: ['P_SpeedBroadcast', 'R_DoorLockState', 'P_HeadlampPower']
  },
  {
    name: 'Dem_BSW_Module',
    type: 'Basic Software (BSW)',
    ecu: 'Central Gateway',
    asil: 'ASIL-B',
    periodicity: 'Event-driven',
    ports: ['PR_DiagServicePort', 'R_CanBusOffEvent', 'P_DtcStorageTrigger']
  }
];

const SAMPLE_INTERFACES: PortInterface[] = [
  {
    name: 'SR_TorqueRequest',
    kind: 'Sender-Receiver',
    provider: 'PowertrainCoordination_SWC',
    consumers: ['Gateway_Router_SWC'],
    dataElements: ['TorqueDemand_Nm (uint16)', 'TorqueGradient (int16)', 'TorqueStatus (enum)']
  },
  {
    name: 'SR_VehicleSpeed',
    kind: 'Sender-Receiver',
    provider: 'BodyControl_SWC',
    consumers: ['PowertrainCoordination_SWC', 'Gateway_Router_SWC'],
    dataElements: ['WheelSpeed_kph (float32)', 'SpeedValidity (bool)']
  },
  {
    name: 'CS_DiagRoutine_Service',
    kind: 'Client-Server',
    provider: 'Dem_BSW_Module',
    consumers: ['Gateway_Router_SWC'],
    dataElements: ['StartRoutine(uint16 id)', 'StopRoutine()', 'RequestResults() -> status']
  },
  {
    name: 'SR_NetworkState',
    kind: 'Sender-Receiver',
    provider: 'Gateway_Router_SWC',
    consumers: ['BodyControl_SWC', 'PowertrainCoordination_SWC'],
    dataElements: ['BusSleepState (enum)', 'WakeupReason (uint8)']
  }
];

export const AnalysisPage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="text-xs font-mono font-bold text-purple-600 uppercase tracking-wider">
            AUTOSAR SPECIFICATION ANALYSIS
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Architecture Overview & Candidate Topologies
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Structural decomposition of ECU Software Components, Port allocations, and VFB signal routing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
            Source: <strong className="text-slate-900">ECU_Central_Gateway_HLD_v2.4.pdf</strong>
          </span>
        </div>
      </div>

      {/* Main Architecture Visualizer & Cards */}
      <ArchitectureGraph
        components={SAMPLE_COMPONENTS}
        interfaces={SAMPLE_INTERFACES}
      />
    </div>
  );
};
