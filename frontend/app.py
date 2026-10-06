import os
import requests
import streamlit as st

# Configure page settings
st.set_page_config(
    page_title="AUTOSAR HLD Analysis Assistant",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Backend URL configuration
DEFAULT_BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
if "backend_url" not in st.session_state:
    st.session_state.backend_url = DEFAULT_BACKEND_URL

# Automotive Engineering Styling
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600&display=swap');
    html, body, [class*="css"], .stMarkdown {
        font-family: 'Playfair Display', Georgia, serif;
    }
    code, pre, .font-mono {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
    }
    .main-header {
        font-family: 'Playfair Display', Georgia, serif;
        border-bottom: 2px solid #1e293b;
        padding-bottom: 12px;
        margin-bottom: 20px;
    }
    .badge {
        display: inline-block;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 600;
        border-radius: 4px;
        background-color: #0f172a;
        color: #38bdf8;
        border: 1px solid #1e293b;
    }
    .metric-card {
        background-color: #0f172a;
        border: 1px solid #334155;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .status-pill-ok {
        color: #22c55e;
        font-weight: bold;
    }
    .status-pill-err {
        color: #ef4444;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# Sidebar Configuration
with st.sidebar:
    st.image("https://img.icons8.com/color/96/car--v1.png", width=64)
    st.title("AUTOSAR Assistant")
    st.caption("High-Level Design Document Analyzer")
    st.markdown("---")
    
    st.subheader("⚙️ System Connection")
    backend_url_input = st.text_input("Backend API URL", value=st.session_state.backend_url)
    if backend_url_input != st.session_state.backend_url:
        st.session_state.backend_url = backend_url_input
        st.rerun()

    # Health check ping
    health_status = "Unknown"
    health_ok = False
    try:
        resp = requests.get(f"{st.session_state.backend_url}/health", timeout=2.0)
        if resp.status_code == 200 and resp.json().get("status") == "healthy":
            health_status = "Online (Healthy)"
            health_ok = True
        else:
            health_status = f"Degraded ({resp.status_code})"
    except Exception:
        health_status = "Offline / Unreachable"

    if health_ok:
        st.success(f"Backend: {health_status}")
    else:
        st.warning(f"Backend: {health_status}")

    st.markdown("---")
    st.caption("Phase 1: Project Foundation\nArchitecture: FastAPI + Streamlit + SQLite + ChromaDB")

# Main Content
st.markdown('<div class="main-header">', unsafe_allow_html=True)
st.title("🚗 AUTOSAR HLD Document Analysis Assistant")
st.markdown(
    "**Academic & Industry Prototype** | Retrieval-Augmented Generation (RAG) for ECU High-Level Software Architecture Specifications"
)
st.markdown('</div>', unsafe_allow_html=True)

col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("📌 System Architecture Overview")
    st.markdown("""
    The **AUTOSAR HLD Analysis Assistant** is designed for systems and automotive software engineers to ingest complex High-Level Design (HLD) specifications, break down software component architectures, and query interfaces, ports, and signals with strict page-level source groundings.

    ### Core Pipeline Layers:
    1. **Document Ingestion**: Multi-page PDF extraction preserving page numbers and section boundaries.
    2. **Structural Chunking**: Domain-aware chunking preserving ECU architectural blocks and interfaces.
    3. **Vector Embeddings**: Dense semantic representations powered by **BGE / E5** models.
    4. **Vector Database**: Local, persistent **ChromaDB** index for high-speed similarity search.
    5. **Grounded RAG Orchestrator**: Context assembly, citation tracking, and non-hallucinatory LLM synthesis.
    6. **Engineering Web UI**: Dedicated multi-page engineering dashboard for documents, queries, and audits.
    """)

with col2:
    st.subheader("🔍 Foundation Health Monitor")
    st.markdown('<div class="metric-card">', unsafe_allow_html=True)
    st.markdown(f"**Target Backend:** `{st.session_state.backend_url}`")
    st.markdown(f"**Current Status:** {'🟢 Online' if health_ok else '🔴 Not Connected'}")
    
    if st.button("Test /health Endpoint", use_container_width=True):
        try:
            r = requests.get(f"{st.session_state.backend_url}/health", timeout=3.0)
            st.json(r.json())
        except Exception as e:
            st.error(f"Connection test failed: {e}")
            st.info("Tip: Start the FastAPI backend with: `uvicorn backend.app.main:app --port 8000`")
    st.markdown('</div>', unsafe_allow_html=True)

    st.info("""
    **Academic Notice:**
    This tool is an engineering assistant for document exploration and research. Output must remain subject to standard automotive engineering review.
    """)

st.markdown("---")
st.markdown("### 🧭 Next Steps")
st.markdown("""
- **Dashboard**: View system status, indexed metrics, and runtime health.
- **Documents**: Manage and upload AUTOSAR HLD PDFs (Phase 2).
- **HLD Assistant**: Ask architecture questions and inspect exact citations (Phases 3-7).
- **Query History**: Review past queries and verifiable evidence.
""")
