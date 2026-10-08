import json
from typing import List, Dict, Any, Optional
try:
    from pydantic import BaseModel, Field
except ImportError:
    from app.models.document import BaseModel, Field


class SourceEvidence(BaseModel):
    page_number: int = Field(..., description="1-indexed document page number")
    section: str = Field(default="General", description="Section or chapter heading")
    snippet: str = Field(default="", description="Verbatim text evidence from specification")


class SoftwareComponent(BaseModel):
    name: str
    component_type: str = Field(..., description="Application SW-C, Service Component, Sensor-Actuator, etc.")
    asil_level: str = Field(default="QM", description="ASIL-D, ASIL-C, ASIL-B, ASIL-A, or QM")
    ecu_allocation: str
    periodicity: str = Field(default="Event-driven", description="Task execution periodicity (e.g., 10ms, 20ms)")
    memory_partition: str = Field(default="Standard Partition", description="Safety-critical OS Application partition")
    description: str
    source_evidence: SourceEvidence


class RTEPort(BaseModel):
    name: str
    port_direction: str = Field(..., description="PPort (Provided) or RPort (Required)")
    owner_swc: str
    interface_bound: str
    queue_length: int = Field(default=0, description="0 for non-queued / data-semantics")
    source_evidence: SourceEvidence


class RTEInterface(BaseModel):
    name: str
    interface_kind: str = Field(..., description="Sender-Receiver or Client-Server")
    provider_swc: Optional[str] = None
    consumer_swcs: List[str] = Field(default_factory=list)
    data_elements: List[str] = Field(default_factory=list)
    description: str = ""
    source_evidence: SourceEvidence


class ArchitectureSignal(BaseModel):
    name: str
    data_type: str
    bit_length: int
    periodicity: str
    bus_channel: str
    initial_value: str = "0"
    source_evidence: SourceEvidence


class ArchitectureDependency(BaseModel):
    source_swc: str
    target_swc: str
    dependency_type: str
    criticality: str
    interface_name: str
    source_evidence: SourceEvidence


class FunctionalFlowStep(BaseModel):
    step_number: int
    component: str
    action: str
    channel_or_port: str


class FunctionalFlow(BaseModel):
    flow_id: str
    name: str
    description: str
    asil: str
    max_latency_ms: int
    steps: List[FunctionalFlowStep] = Field(default_factory=list)
    source_evidence: SourceEvidence


class BusChannel(BaseModel):
    channel_name: str
    protocol: str = Field(..., description="CAN-FD, 100BASE-T1 Ethernet, LIN, FlexRay")
    nominal_bitrate: str
    data_bitrate: Optional[str] = None
    max_payload_bytes: int
    transceiver_driver: str
    attached_ecus: List[str] = Field(default_factory=list)
    source_evidence: SourceEvidence


class ArchitectureModel(BaseModel):
    document_id: Optional[str] = None
    document_name: str
    components: List[SoftwareComponent] = Field(default_factory=list)
    ports: List[RTEPort] = Field(default_factory=list)
    interfaces: List[RTEInterface] = Field(default_factory=list)
    signals: List[ArchitectureSignal] = Field(default_factory=list)
    dependencies: List[ArchitectureDependency] = Field(default_factory=list)
    functional_flows: List[FunctionalFlow] = Field(default_factory=list)
    bus_matrix: List[BusChannel] = Field(default_factory=list)
