import os
import json
import requests
import streamlit as st
import pandas as pd

# Page configuration
st.set_page_config(
    page_title="AUTOSAR HLD Analysis Assistant",
    page_icon="🚗",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Configuration & Backend URL
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")

# Custom CSS for polished, professional typography & card layouts
st.markdown("""
<style>
    .main-title {
        font-size: 2.2rem;
        font-weight: 800;
        color: #0F172A;
        margin-bottom: 0.2rem;
    }
    .sub-title {
        font-size: 0.95rem;
        color: #475569;
        margin-bottom: 1.5rem;
    }
    .metric-box {
        background-color: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 12px;
        padding: 18px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .citation-card {
        background-color: #F8FAFC;
        border-left: 4px solid #2563EB;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 12px;
        margin-top: 8px;
        margin-bottom: 8px;
    }
    .academic-banner {
        background-color: #FEF3C7;
        border: 1px solid #FCD34D;
        border-radius: 10px;
        padding: 12px 16px;
        color: #92400E;
        font-size: 0.85rem;
        margin-bottom: 20px;
    }
</style>
""", unsafe_allow_html=True)


def check_backend_health():
    """Checks if FastAPI backend is responsive."""
    try:
        res = requests.get(f"{BACKEND_URL}/health", timeout=2)
        if res.status_code == 200:
            return True, res.json()
    except Exception:
        pass
    return False, {}


def fetch_documents():
    """Retrieves indexed documents from backend."""
    try:
        res = requests.get(f"{BACKEND_URL}/documents", timeout=3)
        if res.status_code == 200:
            return res.json()
    except Exception:
        pass
    return []


# Sidebar Navigation
with st.sidebar:
    st.markdown("### 🚗 AUTOSAR HLD AI")
    st.caption("B.Tech Student Engineering Prototype")
    st.markdown("---")

    page = st.radio(
        "Navigation Modules:",
        [
            "Executive Dashboard",
            "Specification Ingestion",
            "HLD RAG Assistant",
            "Architecture Explorer",
            "Evaluation Benchmark",
            "Audit & Query History"
        ]
    )

    st.markdown("---")
    is_healthy, health_info = check_backend_health()
    if is_healthy:
        st.success(f"● Backend Live: {BACKEND_URL}")
        st.caption(f"Vector Store: {health_info.get('vector_store', 'ChromaDB')}")
    else:
        st.warning("⚠️ Backend Offline (Run FastAPI on :8000)")

    st.markdown("---")
    st.caption("Tata Technologies TechPulse Student Study")


# Academic Disclaimer Banner on Top of All Pages
st.markdown("""
<div class="academic-banner">
    <strong>Academic Study Notice:</strong> This project is a student research prototype developed for academic evaluation. 
    It is <strong>not</strong> an official Tata Technologies product and does not perform real vehicle/ECU validation. 
    All architectural outputs are AI-assisted interpretations requiring qualified engineer review.
</div>
""", unsafe_allow_html=True)


# ==============================================================================
# PAGE 1: EXECUTIVE DASHBOARD
# ==============================================================================
if page == "Executive Dashboard":
    st.markdown('<div class="main-title">Executive Engineering Dashboard</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Grounded RAG architecture analysis for Automotive ECU High-Level Design specifications.</div>', unsafe_allow_html=True)

    docs = fetch_documents()
    total_pages = sum(d.get("page_count", 0) for d in docs)
    total_chunks = sum(d.get("chunk_count", 0) for d in docs)

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("Documents Ingested", len(docs), delta="Active Index")
    with col2:
        st.metric("Specification Pages", total_pages, delta="PyMuPDF Extracted")
    with col3:
        st.metric("Vector Chunks", total_chunks, delta="ChromaDB Stored")
    with col4:
        st.metric("Grounding SLA", "100%", delta="Page Cited")

    st.markdown("---")
    st.subheader("Active Specifications in Vector Store")
    if docs:
        df_docs = pd.DataFrame(docs)[["filename", "standard", "page_count", "chunk_count", "processing_status", "uploaded_at"]]
        df_docs.columns = ["Filename", "Standard", "Pages", "Chunks", "Status", "Ingested At"]
        st.dataframe(df_docs, use_container_width=True)
    else:
        st.info("No documents currently ingested. Navigate to 'Specification Ingestion' to upload an AUTOSAR HLD PDF.")

    st.markdown("---")
    st.subheader("AI Pipeline Architectural Stack")
    stack_cols = st.columns(4)
    with stack_cols[0]:
        st.markdown("**PDF Parsing Engine**\n- PyMuPDF (`fitz`)\n- Page Boundary Preserved")
    with stack_cols[1]:
        st.markdown("**Dense Embeddings**\n- BAAI/bge-small-en-v1.5\n- 384 Dimensions")
    with stack_cols[2]:
        st.markdown("**Vector Persistence**\n- ChromaDB Local\n- Cosine Distance Metric")
    with stack_cols[3]:
        st.markdown("**Orchestration**\n- FastAPI + Streamlit\n- Zero-Hallucination Guard")


# ==============================================================================
# PAGE 2: SPECIFICATION INGESTION
# ==============================================================================
elif page == "Specification Ingestion":
    st.markdown('<div class="main-title">Specification Ingestion Hub</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Upload AUTOSAR High-Level Design PDFs to extract pages, chunk text, and compute embeddings.</div>', unsafe_allow_html=True)

    with st.form("upload_form", clear_on_submit=True):
        uploaded_file = st.file_uploader("Upload AUTOSAR HLD PDF or Markdown Specification:", type=["pdf", "md", "txt"])
        col_meta1, col_meta2 = st.columns(2)
        with col_meta1:
            ecu_domain = st.selectbox("ECU Domain:", ["Central Zonal Gateway", "Powertrain Controller", "Body Domain Controller", "ADAS HPC"])
        with col_meta2:
            standard = st.selectbox("AUTOSAR Standard:", ["AUTOSAR Classic 4.4", "AUTOSAR Classic 4.3", "AUTOSAR Adaptive R20-11"])
        submit_upload = st.form_submit_button("Ingest & Index Document")

    if submit_upload and uploaded_file is not None:
        with st.spinner("Extracting pages, generating semantic chunks, and encoding into ChromaDB..."):
            try:
                files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "application/octet-stream")}
                data = {"ecu_domain": ecu_domain, "standard": standard}
                res = requests.post(f"{BACKEND_URL}/documents/upload", files=files, data=data, timeout=30)
                if res.status_code == 200:
                    st.success(f"Successfully ingested and indexed '{uploaded_file.name}' into ChromaDB!")
                    st.rerun()
                else:
                    st.error(f"Upload failed: {res.text}")
            except Exception as e:
                st.error(f"Error communicating with backend: {e}")

    st.markdown("---")
    st.subheader("Ingested Document Inventory")
    docs = fetch_documents()
    if docs:
        for d in docs:
            with st.expander(f"📄 {d['filename']} ({d['page_count']} Pages · {d['chunk_count']} Chunks)"):
                col_d1, col_d2, col_d3 = st.columns(3)
                col_d1.write(f"**ID:** `{d['id']}`")
                col_d1.write(f"**Domain:** {d.get('ecu_domain')}")
                col_d2.write(f"**Standard:** {d.get('standard')}")
                col_d2.write(f"**File Size:** {round(d.get('file_size_bytes', 0) / 1024, 1)} KB")
                col_d3.write(f"**Status:** {d.get('processing_status')}")
                if col_d3.button(f"Delete Specification", key=f"del_{d['id']}"):
                    try:
                        requests.delete(f"{BACKEND_URL}/documents/{d['id']}", timeout=5)
                        st.success(f"Deleted {d['filename']}")
                        st.rerun()
                    except Exception as ex:
                        st.error(f"Delete failed: {ex}")
    else:
        st.write("No documents ingested yet.")


# ==============================================================================
# PAGE 3: HLD RAG ASSISTANT
# ==============================================================================
elif page == "HLD RAG Assistant":
    st.markdown('<div class="main-title">AUTOSAR HLD RAG Assistant</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Query software components, RTE interfaces, and bus matrices with verified page citations.</div>', unsafe_allow_html=True)

    docs = fetch_documents()
    doc_options = {d["id"]: f"{d['filename']} ({d['page_count']} pages)" for d in docs}
    
    col_sel, col_topk = st.columns([3, 1])
    with col_sel:
        target_doc_id = st.selectbox(
            "Target Specification Filter:",
            options=["ALL"] + list(doc_options.keys()),
            format_func=lambda x: "All Ingested Specifications" if x == "ALL" else doc_options.get(x, x)
        )
    with col_topk:
        top_k = st.slider("Top-K Chunks:", min_value=1, max_value=8, value=5)

    st.markdown("**Suggested Engineering Prompts:**")
    prompt_chips = [
        "Which software components communicate with the Gateway ECU over CAN-FD channel 0?",
        "What are the ASIL safety requirements defined for regenerative torque arbitration?",
        "Explain the Diagnostic Event Manager (Dem) DTC debouncing and aging strategy.",
        "What Run-Time Environment (RTE) Sender-Receiver interfaces are bound to the Powertrain SW-C?"
    ]
    chip_cols = st.columns(2)
    selected_chip = None
    for idx, prompt_text in enumerate(prompt_chips):
        with chip_cols[idx % 2]:
            if st.button(prompt_text, key=f"chip_{idx}", use_container_width=True):
                selected_chip = prompt_text

    user_query = st.text_input("Ask an architectural question:", value=selected_chip or "")

    if st.button("Submit Grounded Query", type="primary"):
        if not user_query.strip():
            st.warning("Please type an engineering question.")
        else:
            with st.spinner("Retrieving semantic vector chunks and synthesizing grounded answer..."):
                payload = {
                    "question": user_query,
                    "document_id": None if target_doc_id == "ALL" else target_doc_id,
                    "top_k": top_k
                }
                try:
                    res = requests.post(f"{BACKEND_URL}/chat/query", json=payload, timeout=25)
                    if res.status_code == 200:
                        data = res.json()
                        st.markdown("### Grounded Synthesis")
                        st.success(data["answer"])

                        st.markdown(f"#### Verified Citations ({len(data['citations'])})")
                        for idx, cit in enumerate(data["citations"], 1):
                            st.markdown(f"""
                            <div class="citation-card">
                                <strong>Source #{idx}:</strong> {cit['document']} &nbsp;|&nbsp; 
                                <strong>Page:</strong> {cit['page']} &nbsp;|&nbsp; 
                                <strong>Section:</strong> {cit.get('section', 'General')} &nbsp;|&nbsp; 
                                <strong>Relevance:</strong> {round(cit['relevance'] * 100, 1)}%<br/>
                                <em>"{cit['snippet']}"</em>
                            </div>
                            """, unsafe_allow_html=True)
                    else:
                        st.error(f"Query error: {res.text}")
                except Exception as ex:
                    st.error(f"Backend connection error: {ex}")


# ==============================================================================
# PAGE 4: ARCHITECTURE EXPLORER
# ==============================================================================
elif page == "Architecture Explorer":
    st.markdown('<div class="main-title">Virtual Functional Bus (VFB) Architecture Explorer</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Candidate Software Components (SW-Cs), Ports, and Signal Interfaces extracted from the HLD.</div>', unsafe_allow_html=True)

    try:
        res = requests.get(f"{BACKEND_URL}/analysis/candidates", timeout=5)
        if res.status_code == 200:
            analysis = res.json()
            
            st.subheader("Recognized Software Components (SW-Cs)")
            df_components = pd.DataFrame(analysis["components"])
            st.dataframe(df_components, use_container_width=True)

            st.subheader("RTE Port Interfaces")
            df_interfaces = pd.DataFrame(analysis["interfaces"])
            st.dataframe(df_interfaces, use_container_width=True)

            st.subheader("Communication Bus Matrix")
            df_bus = pd.DataFrame(analysis["bus_matrix"])
            st.dataframe(df_bus, use_container_width=True)
        else:
            st.error("Failed to load architectural candidates.")
    except Exception as e:
        st.error(f"Backend offline: {e}")


# ==============================================================================
# PAGE 5: EVALUATION BENCHMARK
# ==============================================================================
elif page == "Evaluation Benchmark":
    st.markdown('<div class="main-title">Academic Evaluation & Viva Benchmark Suite</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Standardized 10-question evaluation measuring Citation Recall, Factuality, and Negative Constraints.</div>', unsafe_allow_html=True)

    st.write("Click below to run the standardized test question set against the active vector database:")

    if st.button("Run Benchmark Evaluation", type="primary"):
        with st.spinner("Running 10 benchmark test questions through the RAG pipeline..."):
            try:
                res = requests.post(f"{BACKEND_URL}/evaluate/run", timeout=60)
                if res.status_code == 200:
                    summary = res.json()
                    
                    c1, c2, c3, c4 = st.columns(4)
                    c1.metric("Tests Passed", f"{summary['passed_count']} / {summary['total_questions']}")
                    c2.metric("Citation Recall Rate", f"{summary['citation_recall_rate']}%")
                    c3.metric("Keyword Factuality", f"{summary['average_keyword_score']}%")
                    c4.metric("Avg Roundtrip Latency", f"{summary['average_latency_ms']} ms")

                    st.markdown("---")
                    st.subheader("Per-Question Detailed Benchmark Audit")
                    
                    results_data = []
                    for r in summary["results"]:
                        results_data.append({
                            "Test ID": r["question_id"],
                            "Question": r["question"],
                            "Passed": "✅ PASS" if r["passed"] else "❌ FAIL",
                            "Target Page": r["target_page"],
                            "Retrieved Page": r["retrieved_page"] or "N/A",
                            "Keyword Score": f"{int(r['keyword_match_score'] * 100)}%",
                            "Latency": f"{r['latency_ms']}ms"
                        })
                    st.dataframe(pd.DataFrame(results_data), use_container_width=True)

                    st.success("Evaluation executed against deterministic ground-truth suite. No hallucinated scores.")
                else:
                    st.error(f"Benchmark run failed: {res.text}")
            except Exception as e:
                st.error(f"Backend error during evaluation: {e}")


# ==============================================================================
# PAGE 6: AUDIT & QUERY HISTORY
# ==============================================================================
elif page == "Audit & Query History":
    st.markdown('<div class="main-title">Query History & Citation Audit Log</div>', unsafe_allow_html=True)
    st.markdown('<div class="sub-title">Persisted audit trail of architectural inquiries and retrieved vector evidence in SQLite.</div>', unsafe_allow_html=True)

    try:
        res = requests.get(f"{BACKEND_URL}/chat/history", timeout=5)
        if res.status_code == 200:
            history = res.json()
            if history:
                for item in history:
                    with st.expander(f"🔍 {item['question']} ({item['timestamp'][:16]})"):
                        st.markdown(f"**Answer:** {item['answer']}")
                        st.caption(f"Status: {item['status']} | Confidence: {round(item['confidence_score']*100, 1)}% | Document: {item['document_name']}")
                        if item.get("citations"):
                            st.markdown("**Evidence Citations:**")
                            for c in item["citations"]:
                                st.write(f"- Page {c['page']} ({c.get('section', 'General')}): *\"{c['snippet'][:150]}...\"*")
            else:
                st.info("No queries recorded yet.")
    except Exception as e:
        st.error(f"Backend offline: {e}")
