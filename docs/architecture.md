# AUTOSAR HLD Document Analysis Assistant - Architecture & Viva Notes
**Project Track:** Tata Technologies TechPulse Automotive Engineering AI  
**Academic Level:** B.Tech Computer Science / Information Technology  

---

## 1. Academic Rationale & Problem Formulation
In modern automotive engineering, Electronic Control Unit (ECU) specifications follow AUTOSAR (AUTomotive Open System ARchitecture). High-Level Design (HLD) documents define:
- **Software Components (SW-Cs):** Application SW-Cs, Sensor-Actuator SW-Cs, and Service Components.
- **Run-Time Environment (RTE):** Software bus communication between components via Sender-Receiver (S/R) and Client-Server (C/S) ports.
- **Basic Software (BSW):** Low-level services such as CAN Interface (`CanIf`), PDU Router (`PduR`), and Diagnostic Event Manager (`Dem`).
- **Functional Safety (ISO 26262):** ASIL classifications (ASIL-A to ASIL-D) and Fault Reaction Time Limits (FRTL).

### The Engineering Trap of Generic LLMs:
Generic LLMs frequently hallucinate port names, invent non-existent signal lengths, or fabricate ASIL safety ratings. In automotive safety-critical systems, an answer without an exact verifiable source page citation cannot be trusted by systems engineers.

---

## 2. RAG System Architecture
This project uses **Retrieval-Augmented Generation (RAG)**:
1. **PyMuPDF (`fitz`):** Extracts text while preserving structural section titles and page boundaries.
2. **Context-Aware Chunker:** Slices text into ~512 token chunks with 64-token overlap, tagging each chunk with `document_id`, `page_number`, and `section_title`.
3. **ChromaDB Vector Store:** Encodes chunks into 384-dimensional dense vectors using cosine distance similarity.
4. **Zero-Hallucination Prompting:** Injects retrieved top-k chunks into a strict system prompt with negative constraints (*"Refuse to answer if evidence is absent"*).
5. **Verifiable Citations:** Returns the answer paired with the document, page number, section, and raw snippet for audit.

---

## 3. Anticipated Viva & Evaluation Questions

**Q1: Why not use a standard generative chatbot like ChatGPT directly?**  
*Answer:* Standard chatbots have no memory of the proprietary, unpublished OEM HLD document. They hallucinate plausible-sounding interfaces. Our RAG system grounds every answer in the indexed document and provides page-level citations for engineer review.

**Q2: Why preserve page numbers during PDF ingestion?**  
*Answer:* In ISO 26262 safety audits and OEM design reviews, engineers must trace every claim back to the approved design document (e.g., Section 4.2, Page 42) before approving changes.

**Q3: How does your system handle questions when the document lacks the answer?**  
*Answer:* Test Case TC-09 tests negative constraints. When asked about FlexRay parameters absent from our Central Gateway spec, the system explicitly responds: *"The ingested specification does not contain sufficient architectural evidence."*

**Q4: What is the difference between Sender-Receiver and Client-Server ports?**  
*Answer:* Sender-Receiver interfaces pass asynchronous cyclic data elements (e.g., vehicle speed, torque demand). Client-Server interfaces represent synchronous function invocations (e.g., diagnostic routines `StartRoutine()` in Dem).
