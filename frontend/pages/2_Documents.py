import os
import requests
import streamlit as st

st.set_page_config(page_title="Documents - AUTOSAR Assistant", page_icon="📁", layout="wide")

backend_url = st.session_state.get("backend_url", os.getenv("BACKEND_URL", "http://localhost:8000"))

st.title("📁 Document Management")
st.caption("Upload and manage AUTOSAR High-Level Design (HLD) specifications")

# Upload Section (Prepares for Phase 2)
st.subheader("📤 Ingest New AUTOSAR HLD Specification")
with st.container():
    uploaded_file = st.file_uploader(
        "Choose an AUTOSAR HLD PDF document",
        type=["pdf"],
        help="Upload ECU High-Level Design or Software Architecture specification PDF"
    )

    if uploaded_file is not None:
        st.info(f"Selected file: **{uploaded_file.name}** ({round(len(uploaded_file.getvalue()) / 1024, 2)} KB)")
        if st.button("🚀 Process & Ingest Document", type="primary"):
            st.warning("Phase 1 Foundation Active. PDF upload and extraction endpoint (`POST /documents/upload`) will be activated in Phase 2.")

st.markdown("---")

st.subheader("📚 Ingested Documents Inventory")

# Fetch document list from backend
docs = []
try:
    r = requests.get(f"{backend_url}/documents", timeout=3.0)
    if r.status_code == 200:
        docs = r.json()
except Exception:
    pass

if not docs:
    st.info("No documents ingested yet. Upload an AUTOSAR HLD PDF once Phase 2 is enabled.")
else:
    for doc in docs:
        with st.expander(f"📄 {doc.get('filename')} (ID: {doc.get('id')})"):
            st.write(f"Status: **{doc.get('processing_status')}**")
            st.write(f"Pages: {doc.get('page_count')} | Chunks: {doc.get('chunk_count')}")
