import os
import requests
import streamlit as st

st.set_page_config(page_title="Query History - AUTOSAR Assistant", page_icon="📜", layout="wide")

backend_url = st.session_state.get("backend_url", os.getenv("BACKEND_URL", "http://localhost:8000"))

st.title("📜 Architecture Query & Audit History")
st.caption("Verifiable audit trail of questions asked, retrieved citations, and generated answers")

# Fetch query history from backend
history_items = []
try:
    r = requests.get(f"{backend_url}/chat/history", timeout=3.0)
    if r.status_code == 200:
        history_items = r.json()
except Exception:
    pass

if not history_items:
    st.info("No query history recorded yet. Queries performed in the HLD Assistant will be recorded here.")
else:
    for idx, item in enumerate(history_items):
        with st.expander(f"Q: {item.get('question')} ({item.get('created_at', '')})"):
            st.markdown(f"**Answer:**\n{item.get('answer')}")
            citations = item.get("citations", [])
            if citations:
                st.markdown("**Citations:**")
                for c in citations:
                    st.write(f"- Page {c.get('page_number')}: Section '{c.get('section_title')}' (Relevance: {c.get('relevance_score')})")
