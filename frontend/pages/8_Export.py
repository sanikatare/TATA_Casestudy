import os
import requests
import streamlit as st

st.set_page_config(page_title="Export & Reports - AUTOSAR Assistant", page_icon="💾", layout="wide")
backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

st.title("💾 Architecture & Review Data Export")
st.caption("Download structured AUTOSAR architecture specifications, consistency findings, and human review decisions in JSON and CSV formats")

c1, c2 = st.columns(2)

with c1:
    st.subheader("📦 Architecture Data")
    st.write("Contains Software Components, Ports, Interfaces, Signals, and Bus Channels.")
    try:
        r_json = requests.get(f"{backend_url}/export/architecture?format=json", timeout=5)
        if r_json.status_code == 200:
            st.download_button("⬇️ Download Architecture (JSON)", r_json.text, "autosar_architecture.json", "application/json", use_container_width=True)
        r_csv = requests.get(f"{backend_url}/export/architecture?format=csv", timeout=5)
        if r_csv.status_code == 200:
            st.download_button("⬇️ Download Architecture (CSV)", r_csv.text, "autosar_architecture.csv", "text/csv", use_container_width=True)
    except Exception as e:
        st.error(f"Backend offline: {e}")

with c2:
    st.subheader("📋 Consistency & Human Review Audit")
    st.write("Contains all architecture findings, severities, suggested actions, and engineering review notes.")
    try:
        rf_json = requests.get(f"{backend_url}/export/findings?format=json", timeout=5)
        if rf_json.status_code == 200:
            st.download_button("⬇️ Download Findings (JSON)", rf_json.text, "autosar_findings.json", "application/json", use_container_width=True)
        rf_csv = requests.get(f"{backend_url}/export/findings?format=csv", timeout=5)
        if rf_csv.status_code == 200:
            st.download_button("⬇️ Download Findings (CSV)", rf_csv.text, "autosar_findings.csv", "text/csv", use_container_width=True)
    except Exception as e:
        st.error(f"Backend offline: {e}")
