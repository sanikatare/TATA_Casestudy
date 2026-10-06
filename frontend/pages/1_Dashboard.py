import os
import requests
import streamlit as st

st.set_page_config(page_title="Dashboard - AUTOSAR Assistant", page_icon="📊", layout="wide")

backend_url = st.session_state.get("backend_url", os.getenv("BACKEND_URL", "http://localhost:8000"))

st.title("📊 Engineering Dashboard")
st.caption("System health, indexed AUTOSAR specifications, and storage metrics")

# Fetch status
health_data = {}
try:
    r = requests.get(f"{backend_url}/health/details", timeout=3.0)
    if r.status_code == 200:
        health_data = r.json()
except Exception:
    pass

# Metric Cards Row
m1, m2, m3, m4 = st.columns(4)

with m1:
    st.metric(label="Active Documents", value="0", help="Total ingested AUTOSAR HLD PDFs")
with m2:
    st.metric(label="Indexed Pages", value="0", help="Extracted pages in vector database")
with m3:
    st.metric(label="Semantic Chunks", value="0", help="Embedded text chunks")
with m4:
    system_status = health_data.get("status", "Offline").upper()
    st.metric(label="System Health", value=system_status, delta="Operational" if system_status == "HEALTHY" else None)

st.markdown("---")

col_left, col_right = st.columns(2)

with col_left:
    st.subheader("🛠️ Component Status")
    status_table = [
        {"Component": "FastAPI Core", "Status": "Online" if health_data else "Offline", "Version": health_data.get("version", "1.0.0")},
        {"Component": "SQLite Metadata DB", "Status": "Connected" if health_data.get("database", {}).get("connected") else "Pending", "Target": health_data.get("database", {}).get("path", "./data/sqlite/autosar_rag.db")},
        {"Component": "ChromaDB Store", "Status": "Ready", "Target": "./data/chroma"},
        {"Component": "Embedding Engine", "Status": "Configured", "Model": health_data.get("configuration", {}).get("embedding_model", "BAAI/bge-small-en-v1.5")},
        {"Component": "LLM Provider", "Status": "Configured", "Provider": health_data.get("configuration", {}).get("llm_provider", "local")},
    ]
    st.table(status_table)

with col_right:
    st.subheader("📋 Phase Implementation Progress")
    progress = [
        ("Phase 1: Project Foundation & Skeleton", "Completed", "FastAPI, Streamlit, SQLite DDL, Health API"),
        ("Phase 2: PDF Ingestion & Extraction", "Pending", "PyMuPDF text extraction preserving page boundaries"),
        ("Phase 3: Structural Chunking", "Pending", "Component-aware overlapping chunk strategy"),
        ("Phase 4: BGE/E5 Vector Embeddings", "Pending", "Local ChromaDB embedding storage"),
        ("Phase 5: Configurable LLM Service", "Pending", "Local model / provider abstraction"),
        ("Phase 6: Grounded RAG Pipeline", "Pending", "Semantic search & cited answer synthesis"),
        ("Phase 7: Verifiable Citations", "Pending", "Exact document name, page, and chunk highlighting"),
        ("Phase 8: AUTOSAR Entity Extractor", "Pending", "SW-C, Ports, Interfaces, Signals mapping"),
    ]
    for p_name, p_stat, p_desc in progress:
        badge_color = "🟢" if p_stat == "Completed" else "⏳"
        st.markdown(f"**{badge_color} {p_name}** — *{p_desc}*")
