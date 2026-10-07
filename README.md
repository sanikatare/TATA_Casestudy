# AUTOSAR HLD Document Analysis Assistant

An intelligent, retrieval-augmented generation (RAG) assistant specifically designed for automotive engineers to analyze **AUTOSAR High-Level Design (HLD)** and software architecture specifications with strict page-level citation traceability.

---

## 1. Project Title
**AUTOSAR HLD Document Analysis Assistant** (Case Study 1 Implementation)

## 2. Problem Statement
Modern automotive Electronic Control Units (ECUs) are built according to AUTOSAR standards. High-Level Design (HLD) specifications frequently span hundreds of pages detailing:
- Software Components (SW-Cs) & Basic Software (BSW) modules
- Communication Ports (PPort, RPort, PRPort)
- Interfaces (Sender-Receiver, Client-Server)
- Signal routing and bus mappings (CAN, LIN, FlexRay, Automotive Ethernet)

Engineers spend extensive hours manually tracing dependencies, verifying component interactions, and finding signal routes. Generic generative AI models frequently hallucinate ECU components and signal mappings. A dedicated, domain-aware RAG system is necessary to provide **grounded, verifiable, page-cited answers** based strictly on ingested engineering documents.

## 3. Objectives
1. **Accurate PDF Ingestion**: Extract technical text while preserving exact page boundaries and structural sections.
2. **Context-Aware Semantic Chunking**: Chunk text around architectural concepts without truncating interface definitions.
3. **High-Precision Embeddings & Vector Search**: Use domain-proven models (BGE / E5) with ChromaDB for dense retrieval.
4. **Strictly Grounded RAG Pipeline**: Synthesize answers solely from retrieved evidence, explicitly denying unsubstantiated claims.
5. **Direct Source Traceability**: Provide explicit citations (Document, Page Number, Section, Relevant Chunk) for every generated answer.
6. **Local Execution Support**: Support local native execution for backend and frontend services.
7. **Explainable Architecture**: Built cleanly for individual academic defense and viva presentations.

---

## 4. System Architecture
```
                         +-----------------------------+
                         | React + Vite Frontend UI    |
                         |        (Port 3000)          |
                         +--------------+--------------+
                                        | HTTP / JSON
                                        v
                         +-----------------------------+
                         |    FastAPI REST Backend     |
                         |         (Port 8000)         |
                         +--------------+--------------+
                                        |
       +--------------------+-----------+------------+--------------------+
       |                    |                        |                    |
       v                    v                        v                    v
+--------------+   +------------------+   +--------------------+   +---------------+
| PDF Parser   |   | Semantic Chunks  |   | Vector Database    |   | SQLite DB     |
| (PyMuPDF)    |   | & Metadata Attach|   | (ChromaDB Persist) |   | (Audit & Docs)|
+--------------+   +------------------+   +--------------------+   +---------------+
                            |                        ^
                            v                        |
                   +------------------+              |
                   | BGE / E5 Dense   |--------------+
                   | Embedding Engine |
                   +------------------+
                            |
                            v Context + Prompt
                   +------------------+
                   |  LLM Provider    |
                   | (Local / Hosted) |
                   +------------------+
```

---

## 5. Technology Stack
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic v2
- **Frontend**: React 19 + Vite + TypeScript
- **Database**: SQLite (structured metadata, query logs, citation trails)
- **Vector Storage**: ChromaDB (persistent local vector store)
- **Embeddings**: BAAI/bge-small-en-v1.5 (SentenceTransformers)
- **Document Parser**: PyMuPDF (`fitz`)
- **Testing**: pytest, pytest-asyncio, HTTPX
- **Orchestration**: Local FastAPI + Vite development servers

---

## 6. Folder Structure
```
project-root/
│
├── app/                            # FastAPI backend (routes, RAG, ingestion, services)
│   ├── main.py
│   ├── config.py
│   ├── ingestion/
│   ├── rag/
│   ├── services/
│   ├── models/
│   └── utils/
│
├── src/                            # React + Vite frontend
│   ├── pages/
│   ├── components/
│   ├── services/api.ts
│   └── types/
│
├── data/
│   ├── uploads/                    # Stored PDF documents
│   ├── chroma/                     # ChromaDB persistent vector collection
│   └── sqlite/                     # SQLite database files
│
├── tests/
│   └── test_health.py              # Health check and schema validation tests
│
├── package.json                    # Frontend dependencies and scripts
├── .env.example                    # Template environment variables
├── .gitignore                      # Git exclusion rules
├── requirements.txt                # Unified requirements file
└── README.md                       # Comprehensive project documentation
```

---

## 7. Installation & Setup

### Prerequisites
- Python 3.10 or 3.11
- pip / virtualenv
- Node.js 20+ and npm

### 1. Create Virtual Environment
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

---

## 8. Running Locally

### Start Backend (Terminal 1)
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be available at:
- Swagger UI: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`

### Start Frontend (Terminal 2)
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 9. Frontend Backend URL
Set `VITE_BACKEND_URL` in `.env` if your API is not running at the default endpoint.
```bash
VITE_BACKEND_URL=http://localhost:8000
```

---

## 10. API Endpoints

| Method | Endpoint | Description | Phase |
|---|---|---|---|
| `GET` | `/health` | Core health check returning `{"status": "healthy"}` | Phase 1 |
| `GET` | `/` | API status and root links | Phase 1 |
| `GET` | `/documents` | List all ingested AUTOSAR documents | Phase 1 & 2 |
| `POST`| `/documents/upload`| Upload, validate & extract AUTOSAR HLD PDF with PyMuPDF | Phase 2 |
| `GET` | `/documents/{id}` | Detailed document metadata | Phase 2 |
| `DELETE`| `/documents/{id}` | Remove document, physical files & cached parsing | Phase 2 |
| `POST`| `/chat/query` | Execute grounded RAG query with citations | Phase 6 |
| `GET` | `/chat/history` | Retrieve query and citation history | Phase 6 & 7 |
| `POST` | `/search/semantic` | Retrieve top-k semantic chunks with similarity scores | Phase 6 |
| `GET` | `/analysis/architecture` | Extract architecture model view | Phase 5 |

---

## 11. Database Schema (SQLite)
The application uses SQLite with standard SQL syntax so it can migrate to PostgreSQL seamlessly:

### `documents`
- `id` (TEXT PRIMARY KEY) - Document UUID
- `filename` (TEXT) - Uploaded PDF name
- `file_path` (TEXT) - Local storage path
- `file_size_bytes` (INTEGER) - File size
- `page_count` (INTEGER) - Total extracted pages
- `chunk_count` (INTEGER) - Generated semantic chunks
- `processing_status` (TEXT) - Status (`PENDING`, `INDEXED`, `FAILED`)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### `queries`
- `id` (TEXT PRIMARY KEY) - Query UUID
- `document_id` (TEXT REFERENCES documents)
- `question` (TEXT) - Natural language query
- `answer` (TEXT) - Grounded LLM response
- `confidence_score` (REAL)
- `created_at` (TIMESTAMP)

### `citations`
- `id` (TEXT PRIMARY KEY) - Citation UUID
- `query_id` (TEXT REFERENCES queries)
- `document_id` (TEXT REFERENCES documents)
- `page_number` (INTEGER) - PDF source page
- `section_title` (TEXT) - Section name
- `chunk_id` (TEXT) - Chunk identifier
- `snippet` (TEXT) - Exact text excerpt
- `relevance_score` (REAL) - Similarity score

---

## 12. Academic Defense & Viva Notes
1. **Why not a generic Chatbot?**
   Generic chatbots hallucinate non-existent interfaces and port names. In automotive safety and ISO 26262 contexts, every architectural answer must have verifiable source traceability.
2. **Why preserve Page Numbers during PDF Extraction?**
   If an engineer asks about the *Gateway Routing Table*, the answer must cite Page 42 so the engineer can independently verify it against the approved OEM specification.
3. **Decoupled Architecture**:
   The React frontend never queries the vector database or SQLite directly. All operations pass through the FastAPI REST layer, ensuring loose coupling and production readiness.

---

## 13. Limitations & Academic Boundary
- This application is an **engineering research and assistance prototype**.
- It does **not** certify AUTOSAR XML (ARXML) models.
- It does **not** replace formal automotive system approval or OEM engineering governance.
- All AI-generated responses should remain subject to human engineering review.
