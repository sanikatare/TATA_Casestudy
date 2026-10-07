import os
import requests
import streamlit as st

st.set_page_config(page_title="Document Comparison - AUTOSAR Assistant", page_icon="⚖️", layout="wide")
backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

st.title("⚖️ Specification Version Comparison")
st.caption("Compare two AUTOSAR HLD versions to detect added, removed, and modified sections and architecture entities")

try:
    r_docs = requests.get(f"{backend_url}/documents", timeout=3)
    docs = r_docs.json() if r_docs.status_code == 200 else []
except Exception:
    docs = []

if docs:
    opts = {d["id"]: f"{d['filename']} ({d.get('standard', 'AUTOSAR')})" for d in docs}
    col1, col2 = st.columns(2)
    with col1:
        doc_a = st.selectbox("Base Version (A):", list(opts.keys()), key="doc_cmp_a", format_func=lambda x: opts[x])
    with col2:
        doc_b = st.selectbox("Target Version (B):", list(opts.keys()), key="doc_cmp_b", format_func=lambda x: opts[x])

    if st.button("Compare Versions", type="primary"):
        try:
            payload = {"document_id_a": doc_a, "document_id_b": doc_b}
            res = requests.post(f"{backend_url}/documents/compare", json=payload, timeout=15)
            if res.status_code == 200:
                diff = res.json()
                summary = diff["summary"]

                st.subheader("Comparison Summary")
                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Added", summary["total_added"])
                m2.metric("Removed", summary["total_removed"])
                m3.metric("Modified", summary["total_modified"])
                m4.metric("Compatibility", summary["architecture_compatibility"])

                st.info(summary["summary_text"])

                st.markdown("### Entity Diffs")
                all_diffs = diff["section_diffs"] + diff["component_diffs"] + diff["interface_diffs"] + diff["bus_matrix_diffs"]
                for d in all_diffs:
                    tag = "🟢 ADDED" if d["change_type"] == "ADDED" else "🔴 REMOVED" if d["change_type"] == "REMOVED" else "🟡 MODIFIED"
                    st.write(f"**{tag}** [{d['category']}] **{d['name']}**: {d['details']}")
            else:
                st.error(f"Comparison failed: {res.text}")
        except Exception as e:
            st.error(f"Error communicating with backend: {e}")
else:
    st.info("No documents found to compare. Upload a specification in Documents first.")
