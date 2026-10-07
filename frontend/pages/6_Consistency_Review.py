import os
import requests
import streamlit as st

st.set_page_config(page_title="Consistency & Review - AUTOSAR Assistant", page_icon="🛡️", layout="wide")
backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

st.title("🛡️ Consistency Checks & Human Review")
st.caption("Automated architecture audits for dangling ports, ASIL mismatches, and persistent engineering review workflow")

try:
    r_sum = requests.get(f"{backend_url}/reviews/summary", timeout=5)
    r_find = requests.get(f"{backend_url}/reviews", timeout=5)

    if r_sum.status_code == 200 and r_find.status_code == 200:
        summary = r_sum.json()
        findings = r_find.json()

        m1, m2, m3, m4, m5 = st.columns(5)
        m1.metric("Total Findings", summary["total_findings"])
        m2.metric("Pending", summary["pending_count"])
        m3.metric("Accepted", summary["accepted_count"])
        m4.metric("Rejected", summary["rejected_count"])
        m5.metric("High Severity", summary["high_severity_count"])

        st.markdown("---")
        for f in findings:
            status_badge = "🟢 ACCEPTED" if f["review_status"] == "ACCEPTED" else "🔴 REJECTED" if f["review_status"] == "REJECTED" else "⏳ PENDING"
            with st.expander(f"[{f['severity']}] {f['title']} — {status_badge}"):
                st.write(f"**Rule:** `{f['rule_id']}` | **Category:** {f['category']} | **Entity:** `{f['entity_affected']}`")
                st.write(f"**Description:** {f['description']}")
                st.write(f"**Suggested Action:** {f['suggested_action']}")
                st.info(f"**Evidence:** Page {f['source_evidence']['page_number']} ({f['source_evidence']['section']}): \"{f['source_evidence']['snippet']}\"")

                col_txt, col_btn1, col_btn2 = st.columns([3, 1, 1])
                with col_txt:
                    comments = st.text_input("Engineer Rationale:", key=f"p6_notes_{f['id']}", value=f.get("engineer_comments", ""))
                with col_btn1:
                    st.write("&nbsp;")
                    if st.button("✅ Accept", key=f"p6_acc_{f['id']}", use_container_width=True):
                        requests.post(f"{backend_url}/reviews/{f['id']}", json={"status": "ACCEPTED", "engineer_comments": comments, "reviewed_by": "Lead_Engineer"})
                        st.success("Accepted")
                        st.rerun()
                with col_btn2:
                    st.write("&nbsp;")
                    if st.button("❌ Reject", key=f"p6_rej_{f['id']}", use_container_width=True):
                        requests.post(f"{backend_url}/reviews/{f['id']}", json={"status": "REJECTED", "engineer_comments": comments, "reviewed_by": "Lead_Engineer"})
                        st.warning("Rejected")
                        st.rerun()
    else:
        st.error("Failed to load review findings.")
except Exception as e:
    st.error(f"Backend offline: {e}")
