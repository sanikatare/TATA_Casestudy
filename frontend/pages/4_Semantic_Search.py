import os
import requests
import streamlit as st

st.set_page_config(page_title="Semantic Search - AUTOSAR Assistant", page_icon="🔍", layout="wide")
backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

st.title("🔍 Semantic Vector Search")
st.caption("Dense vector search with similarity scores and page-level source snippets")

query = st.text_input("Enter architectural query or technical term:", placeholder="e.g., CAN-FD bitrate, Dem DTC debouncing, ASIL-D torque")
top_k = st.slider("Top-K Results:", min_value=1, max_value=15, value=5)

if st.button("Search Vector Store", type="primary"):
    if not query.strip():
        st.warning("Please type a search query.")
    else:
        try:
            payload = {"query": query, "top_k": top_k}
            res = requests.post(f"{backend_url}/search/semantic", json=payload, timeout=15)
            if res.status_code == 200:
                data = res.json()
                st.subheader(f"Retrieved Chunks ({data['total_results']})")
                for hit in data["results"]:
                    st.markdown(f"""
                    **#{hit['rank']} Score: {round(hit['similarity_score'] * 100, 2)}%** | Document: `{hit['document_name']}` | Page: **{hit['page_number']}** | Section: *{hit['section']}*
                    > "{hit['snippet']}"
                    ---
                    """)
            else:
                st.error(f"Search failed: {res.text}")
        except Exception as e:
            st.error(f"Backend error: {e}")
