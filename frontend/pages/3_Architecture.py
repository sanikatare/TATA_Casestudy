import os
import requests
import streamlit as st
import pandas as pd

st.set_page_config(page_title="Architecture Analysis - AUTOSAR Assistant", page_icon="🧩", layout="wide")
backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

st.title("🧩 Virtual Functional Bus (VFB) Architecture Analysis")
st.caption("Extracted Software Components, Ports, Interfaces, Signals, Functional Flows, and Bus Matrix with verified source citations")

try:
    res = requests.get(f"{backend_url}/analysis/architecture", timeout=5)
    if res.status_code == 200:
        arch = res.json()

        tab1, tab2, tab3, tab4, tab5, tab6, tab7 = st.tabs([
            "SW-Cs", "Ports", "Interfaces", "Signals", "Dependencies", "Functional Flows", "Bus Matrix"
        ])

        with tab1:
            st.subheader(f"Software Components ({len(arch['components'])})")
            for c in arch["components"]:
                with st.expander(f"📦 {c['name']} [{c['asil_level']} · {c['component_type']}]"):
                    st.write(f"**ECU:** {c['ecu_allocation']} | **Periodicity:** {c['periodicity']} | **Memory Partition:** {c['memory_partition']}")
                    st.write(f"**Description:** {c['description']}")
                    st.info(f"**Evidence:** Page {c['source_evidence']['page_number']} ({c['source_evidence']['section']}): \"{c['source_evidence']['snippet']}\"")

        with tab2:
            st.subheader(f"RTE Ports ({len(arch['ports'])})")
            for p in arch["ports"]:
                with st.expander(f"🔌 {p['name']} ({p['port_direction']})"):
                    st.write(f"**Owner:** {p['owner_swc']} | **Interface Bound:** {p['interface_bound']}")
                    st.info(f"**Evidence:** Page {p['source_evidence']['page_number']} ({p['source_evidence']['section']}): \"{p['source_evidence']['snippet']}\"")

        with tab3:
            st.subheader(f"RTE Interfaces ({len(arch['interfaces'])})")
            for i in arch["interfaces"]:
                with st.expander(f"🔄 {i['name']} ({i['interface_kind']})"):
                    st.write(f"**Provider:** {i['provider_swc']} | **Consumers:** {', '.join(i['consumer_swcs'])}")
                    st.write("**Data Elements:**", ", ".join(i['data_elements']))
                    st.info(f"**Evidence:** Page {i['source_evidence']['page_number']} ({i['source_evidence']['section']}): \"{i['source_evidence']['snippet']}\"")

        with tab4:
            st.subheader(f"Signals ({len(arch['signals'])})")
            for s in arch["signals"]:
                with st.expander(f"📶 {s['name']} ({s['data_type']} · {s['bus_channel']})"):
                    st.write(f"**Length:** {s['bit_length']} bits | **Periodicity:** {s['periodicity']} | **Initial Value:** {s['initial_value']}")
                    st.info(f"**Evidence:** Page {s['source_evidence']['page_number']} ({s['source_evidence']['section']}): \"{s['source_evidence']['snippet']}\"")

        with tab5:
            st.subheader(f"Component Dependencies ({len(arch['dependencies'])})")
            for d in arch["dependencies"]:
                with st.expander(f"🔗 {d['source_swc']} ➔ {d['target_swc']}"):
                    st.write(f"**Type:** {d['dependency_type']} | **Criticality:** {d['criticality']} | **Interface:** {d['interface_name']}")
                    st.info(f"**Evidence:** Page {d['source_evidence']['page_number']} ({d['source_evidence']['section']}): \"{d['source_evidence']['snippet']}\"")

        with tab6:
            st.subheader(f"Functional Flows ({len(arch['functional_flows'])})")
            for f in arch["functional_flows"]:
                with st.expander(f"⚡ {f['flow_id']}: {f['name']} [{f['asil']} · {f['max_latency_ms']}ms]"):
                    st.write(f"**Description:** {f['description']}")
                    for step in f['steps']:
                        st.write(f"{step['step_number']}. **{step['component']}**: {step['action']} ({step['channel_or_port']})")
                    st.info(f"**Evidence:** Page {f['source_evidence']['page_number']} ({f['source_evidence']['section']}): \"{f['source_evidence']['snippet']}\"")

        with tab7:
            st.subheader(f"Bus Matrix ({len(arch['bus_matrix'])})")
            for b in arch["bus_matrix"]:
                with st.expander(f"🚌 {b['channel_name']} ({b['protocol']})"):
                    st.write(f"**Nominal:** {b['nominal_bitrate']} | **Data:** {b.get('data_bitrate', 'N/A')} | **Payload:** {b['max_payload_bytes']} bytes")
                    st.write(f"**Attached ECUs:** {', '.join(b['attached_ecus'])}")
                    st.info(f"**Evidence:** Page {b['source_evidence']['page_number']} ({b['source_evidence']['section']}): \"{b['source_evidence']['snippet']}\"")
    else:
        st.error(f"Failed to fetch architecture data: {res.text}")
except Exception as e:
    st.error(f"Backend offline: {e}")
