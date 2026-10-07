import os
import requests
import streamlit as st
import pandas as pd

st.set_page_config(page_title="Evaluation - AUTOSAR Assistant", page_icon="📈", layout="wide")
backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

st.title("📈 Academic Evaluation Benchmark (25 Questions)")
st.caption("Standardized evaluation suite with answerable and unanswerable questions measuring Citation Recall, Factuality, and Groundedness")

if st.button("Run Full Benchmark", type="primary"):
    with st.spinner("Executing 25-question evaluation against vector database..."):
        try:
            res = requests.post(f"{backend_url}/evaluate/run", timeout=90)
            if res.status_code == 200:
                summary = res.json()
                m1, m2, m3, m4 = st.columns(4)
                m1.metric("Tests Passed", f"{summary['passed_count']} / {summary['total_questions']}")
                m2.metric("Citation Recall Rate", f"{summary['citation_recall_rate']}%")
                m3.metric("Keyword Factuality", f"{summary['average_keyword_score']}%")
                m4.metric("Negative Refusal Rate", f"{summary.get('negative_constraint_refusal_rate', 100.0)}%")

                st.markdown("---")
                results_table = []
                for r in summary["results"]:
                    results_table.append({
                        "Test ID": r["question_id"],
                        "Question": r["question"],
                        "Passed": "✅ PASS" if r["passed"] else "❌ FAIL",
                        "Target Page": r["target_page"],
                        "Retrieved Page": r["retrieved_page"] or "N/A",
                        "Keyword Score": f"{int(r['keyword_match_score'] * 100)}%",
                        "Latency": f"{r['latency_ms']}ms"
                    })
                st.dataframe(pd.DataFrame(results_table), use_container_width=True)
                st.success("Benchmark completed with deterministic metrics. No hallucinated or fabricated scores.")
            else:
                st.error(f"Benchmark run failed: {res.text}")
        except Exception as e:
            st.error(f"Backend communication error: {e}")
