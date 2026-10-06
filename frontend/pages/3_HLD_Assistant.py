import os
import requests
import streamlit as st

st.set_page_config(page_title="HLD Assistant - AUTOSAR", page_icon="🤖", layout="wide")

backend_url = st.session_state.get("backend_url", os.getenv("BACKEND_URL", "http://localhost:8000"))

st.title("🤖 AUTOSAR HLD Architecture Assistant")
st.caption("Ask natural-language questions about components, interfaces, ports, and signals with verified citations")

col_left, col_center, col_right = st.columns([1, 2, 1.2])

with col_left:
    st.subheader("⚙️ Retrieval Scope")
    st.selectbox("Select Target Specification", options=["No documents loaded (Phase 1)"], disabled=True)
    top_k = st.slider("Top-K Evidence Chunks", min_value=1, max_value=15, value=5)
    st.checkbox("Strict AUTOSAR Context Grounding", value=True, help="Instructs the LLM to decline questions if not supported by HLD text")
    st.markdown("---")
    st.markdown("##### 💡 Example Queries")
    st.markdown("""
    - *Which components communicate with the CAN Gateway?*
    - *What sender-receiver interfaces are defined for BSW?*
    - *Where is the Diagnostics Manager component mapped?*
    - *What signals are exchanged over FlexRay Bus?*
    """)

with col_center:
    st.subheader("💬 Engineering Query Console")
    query_text = st.text_area(
        "Enter Architecture Question:",
        placeholder="e.g. Which software components are connected to the Powertrain Coordination SW-C?",
        height=120
    )
    
    col_btn, _ = st.columns([1, 2])
    with col_btn:
        ask_btn = st.button("🔍 Execute RAG Retrieval", type="primary", use_container_width=True)

    if ask_btn:
        if not query_text.strip():
            st.warning("Please enter a valid question.")
        else:
            st.info("System is currently in **Phase 1: Project Foundation**. Ingestion, Vector DB, and LLM inference will be connected in Phases 2-6.")

with col_right:
    st.subheader("📑 Verified Citations & Evidence")
    st.markdown("""
    *Evidence snippets and exact document page citations will appear here after executing a query.*
    """)
    st.caption("Guaranteed traceability: Document Name, Page Number, Section Title, and Semantic Relevance.")
