import os
import requests
import streamlit as st

st.set_page_config(page_title="Documents - AUTOSAR Assistant", page_icon="📁", layout="wide")

backend_url = st.session_state.get("backend_url", os.getenv("BACKEND_URL", "http://localhost:8000"))

# Styling
st.markdown("""
<style>
    .doc-card {
        background-color: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
    }
    .badge-indexed {
        background-color: #064e3b;
        color: #34d399;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
    }
    .badge-pending {
        background-color: #78350f;
        color: #fbbf24;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
    }
    .badge-failed {
        background-color: #7f1d1d;
        color: #f87171;
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
    }
    .sec-tag {
        display: inline-block;
        background-color: #1e293b;
        color: #94a3b8;
        border: 1px solid #334155;
        border-radius: 4px;
        padding: 2px 8px;
        margin: 3px;
        font-size: 12px;
    }
</style>
""", unsafe_allow_html=True)

st.title("📁 AUTOSAR Document Ingestion & Processing")
st.caption("Upload, inspect, and parse ECU High-Level Design (HLD) specifications with page boundary and section preservation")

col_upload, col_sample = st.columns([2, 1])

with col_upload:
    st.subheader("📤 Upload AUTOSAR Specification (PDF)")
    uploaded_file = st.file_uploader(
        "Choose an AUTOSAR HLD PDF document",
        type=["pdf"],
        help="Upload ECU High-Level Design, VFB Architecture, or Software Component specification (Max 50MB)",
    )

    if uploaded_file is not None:
        file_size_kb = round(len(uploaded_file.getvalue()) / 1024, 2)
        st.info(f"Selected: **{uploaded_file.name}** ({file_size_kb} KB)")
        
        if st.button("🚀 Process & Ingest Document", type="primary", use_container_width=True):
            with st.spinner("Extracting text, page boundaries, and architectural sections with PyMuPDF..."):
                try:
                    files = {"file": (uploaded_file.name, uploaded_file.getvalue(), "application/pdf")}
                    resp = requests.post(f"{backend_url}/documents/upload", files=files, timeout=30.0)
                    
                    if resp.status_code == 201:
                        data = resp.json()
                        st.success(f"Successfully Ingested **{data.get('filename')}**!")
                        
                        m1, m2, m3 = st.columns(3)
                        with m1:
                            st.metric("Total Pages", data.get("page_count", 0))
                        with m2:
                            st.metric("Total Characters", f"{data.get('total_characters', 0):,}")
                        with m3:
                            st.metric("Sections Detected", len(data.get("sections_detected", [])))
                        
                        if data.get("sections_detected"):
                            st.markdown("**Detected Architectural Sections:**")
                            tags_html = "".join([f'<span class="sec-tag">{s}</span>' for s in data["sections_detected"]])
                            st.markdown(tags_html, unsafe_allow_html=True)
                            
                        st.rerun()
                    else:
                        st.error(f"Ingestion failed (HTTP {resp.status_code}): {resp.text}")
                except Exception as e:
                    st.error(f"Error connecting to backend: {e}")

with col_sample:
    st.subheader("🧪 Rapid Testing Sample")
    st.markdown("""
    Don't have an AUTOSAR PDF on hand? Generate our verified 4-page **Powertrain & Gateway ECU Architecture HLD** with:
    - SW-C component hierarchy (EngineControl, TransmissionManager, GatewayRouter)
    - Formatted Port Interface table (PPort, RPort, PRPort)
    - RTE generation & BSW module allocations
    """)
    if st.button("📄 Generate & Ingest Sample HLD", use_container_width=True):
        with st.spinner("Synthesizing and extracting sample AUTOSAR HLD specification..."):
            try:
                resp = requests.post(f"{backend_url}/documents/sample", timeout=30.0)
                if resp.status_code == 201:
                    data = resp.json()
                    st.success(f"Sample ingested: {data.get('page_count')} pages extracted!")
                    st.rerun()
                else:
                    st.error(f"Failed to generate sample: {resp.text}")
            except Exception as e:
                st.error(f"Error: {e}")

st.markdown("---")

# Document Inventory Section
st.subheader("📚 Ingested Documents Inventory")

docs = []
try:
    resp = requests.get(f"{backend_url}/documents", timeout=5.0)
    if resp.status_code == 200:
        docs = resp.json()
except Exception as e:
    st.warning(f"Could not load document repository from backend: {e}")

if not docs:
    st.info("No documents in repository. Upload a PDF or click 'Generate & Ingest Sample HLD' above.")
else:
    st.caption(f"Showing {len(docs)} document(s) registered in SQLite repository.")
    
    for doc in docs:
        doc_id = doc.get("id")
        status_val = doc.get("processing_status", "UNKNOWN")
        
        if status_val == "INDEXED":
            badge = '<span class="badge-indexed">● INDEXED</span>'
        elif status_val == "PENDING":
            badge = '<span class="badge-pending">● PENDING</span>'
        else:
            badge = '<span class="badge-failed">● FAILED</span>'

        size_kb = round(doc.get("file_size_bytes", 0) / 1024, 1)
        created_str = str(doc.get("created_at", ""))[:19]

        with st.expander(f"📄 {doc.get('filename')} — {doc.get('page_count')} Pages ({size_kb} KB) — {status_val}"):
            col_info1, col_info2, col_info3 = st.columns([2, 2, 1])
            with col_info1:
                st.markdown(f"**Document ID:** `{doc_id}`")
                st.markdown(f"**Status:** {badge}", unsafe_allow_html=True)
                st.markdown(f"**Created At:** `{created_str}`")
            with col_info2:
                st.markdown(f"**Page Count:** {doc.get('page_count')}")
                st.markdown(f"**Chunk Count:** {doc.get('chunk_count')}")
                st.markdown(f"**Storage Path:** `{doc.get('file_path')}`")
            with col_info3:
                if st.button("🗑️ Delete", key=f"del_{doc_id}", type="secondary", use_container_width=True):
                    try:
                        del_resp = requests.delete(f"{backend_url}/documents/{doc_id}", timeout=5.0)
                        if del_resp.status_code == 200:
                            st.success("Document deleted.")
                            st.rerun()
                        else:
                            st.error(f"Delete failed: {del_resp.text}")
                    except Exception as e:
                        st.error(f"Delete error: {e}")

            # Inspect extracted pages and sections
            st.markdown("#### 🔍 Extracted Page Analysis")
            try:
                detail_resp = requests.get(f"{backend_url}/documents/{doc_id}", timeout=5.0)
                if detail_resp.status_code == 200:
                    detail = detail_resp.json()
                    sections = detail.get("sections", [])
                    pages = detail.get("pages", [])

                    if sections:
                        st.markdown("**Detected Chapter & Section Headers:**")
                        tags_html = "".join([f'<span class="sec-tag">{s}</span>' for s in sections])
                        st.markdown(tags_html, unsafe_allow_html=True)

                    if pages:
                        tabs = st.tabs([f"Page {p['page_number']}" for p in pages])
                        for idx, tab in enumerate(tabs):
                            with tab:
                                p_data = pages[idx]
                                st.caption(f"Page {p_data['page_number']} | Characters: {p_data['char_count']} | Tables: {p_data['tables_count']}")
                                if p_data.get("sections"):
                                    st.write(f"**Sections on this page:** {', '.join(p_data['sections'])}")
                                st.text_area(
                                    f"Extracted Text Preview (Page {p_data['page_number']})",
                                    value=p_data.get("text_preview", ""),
                                    height=140,
                                    disabled=True,
                                    key=f"preview_{doc_id}_{idx}"
                                )
                else:
                    st.info("Detailed page metadata not available.")
            except Exception as e:
                st.warning(f"Could not load page details: {e}")
