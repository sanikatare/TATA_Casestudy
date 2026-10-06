# AUTOSAR HLD Document Analysis Assistant
**Tata Technologies TechPulse Automotive Engineering AI — Student Project**

An intelligent, retrieval-augmented generation (RAG) assistant specifically designed for automotive engineering students and engineers to analyze **AUTOSAR High-Level Design (HLD)** specifications with verified page-level and section-level citation traceability.

---

## 📌 Project Overview
- **Track:** Tata Technologies TechPulse Automotive Engineering AI
- **Domain:** AUTOSAR Classic (4.4) / Adaptive Architecture, Virtual Functional Bus (VFB), ISO 26262 Functional Safety
- **Core Technology:** Python 3.10+, FastAPI REST API, Streamlit Engineering UI, ChromaDB, Sentence-Transformers / BGE-small, PyMuPDF, SQLite, Google Gemini API

> **Academic Notice:** This software is an engineering study prototype developed for academic and college evaluation. It is **not** an official Tata Technologies commercial product and does **not** certify or validate real vehicle/ECU firmware. Human engineering review remains required for all outputs.

---

## 📁 Project Architecture & Structure

```text
├── app/
│   ├── main.py                 # FastAPI application entrypoint & API endpoints
│   ├── config.py               # Pydantic Settings & environment variables
│   ├── models/                 # Pydantic schemas (Document, Query, Citation, Benchmark)
│   ├── services/               # Database (SQLite), Vector Store (ChromaDB), Embeddings, LLM client
│   ├── rag/                    # Dense semantic retriever & RAG synthesis pipeline
│   ├── ingestion/              # PyMuPDF text extractor & context-aware chunker
│   ├── evaluation/             # 10-question ground-truth evaluation benchmark
│   └── utils/                  # Structured logging & helpers
├── frontend/
│   └── streamlit_app.py        # Multi-module Streamlit engineering interface
├── data/
│   ├── documents/              # Persisted PDF uploads & synthetic sample HLD specs
│   ├── processed/              # Cleaned text caches
│   └── evaluation/             # ground_truth.json test suite
├── vector_store/
│   └── chroma/                 # Local persistent ChromaDB vector collection
├── prompts/
│   └── system_prompt.txt       # Strict zero-hallucination prompt template
├── tests/                      # Pytest unit tests (health, chunking, rag)
├── docs/
│   └── architecture.md         # Comprehensive viva presentation & technical notes
├── requirements.txt            # Python dependencies
├── .env.example                # Sample environment variables
├── .gitignore                  # Git exclusion rules
└── README.md                   # Complete local setup & demo guide
```

---

## 🚀 How to Run the Project Locally

### Step 1: Clone & Setup Python Virtual Environment
Open your terminal in the project directory:

```bash
# 1. Create a virtual environment (Python 3.10 or 3.11 recommended)
python3 -m venv .venv

# 2. Activate the virtual environment
# On Linux / macOS:
source .venv/bin/activate

# On Windows (Command Prompt):
# .venv\Scripts\activate.bat
# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
```

---

### Step 2: Install Dependencies
Install all required packages from `requirements.txt`:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 3: Configure Environment Variables
Copy the sample `.env.example` file to `.env`:

```bash
cp .env.example .env
```

*(Optional)* If you have a Google Gemini API key:
```env
GEMINI_API_KEY=your_actual_key_here
```
> **Note for Viva / Local Demo:** If you do not provide an API key, the system automatically uses its local deterministic grounded synthesizer so the entire prototype runs offline without errors!

---

### Step 4: Start the FastAPI Backend (Terminal 1)
Start the backend server on port `8000`:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You can verify the backend is running by opening:
- **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Step 5: Start the Streamlit Frontend (Terminal 2)
Open a second terminal, activate the same virtual environment, and run:

```bash
streamlit run frontend/streamlit_app.py --server.port 8501
```

Streamlit will launch automatically in your browser at:
👉 **[http://localhost:8501](http://localhost:8501)**

---

## 🧪 Running Unit Tests
To verify all modules and endpoints with pytest:

```bash
pytest tests/ -v
```

---

## 🎓 Demonstrating in a College Viva / Evaluation (5-Step Walkthrough)

1. **Dashboard:** Show the Executive Dashboard showing the pre-indexed baseline specification (*ECU Central Gateway HLD v2.4*), total pages, and vector chunks in ChromaDB.
2. **Specification Ingestion:** Upload an AUTOSAR HLD PDF or markdown file. Show the chunk count and page count updated in real time.
3. **HLD RAG Assistant:**
   - Click the suggested prompt: *"Which software components communicate with the Gateway ECU over CAN-FD channel 0?"*
   - Show the grounded answer citing **Page 42, Section 4.2**.
   - Expand the citation card to reveal the exact excerpt extracted from ChromaDB.
4. **Architecture Explorer:** Demonstrate candidate entities (Application SW-C, ASIL-D rating, cyclic periods, and RTE S/R port bindings).
5. **Evaluation Benchmark Suite:** Go to *Evaluation Benchmark*, click **"Run Benchmark Evaluation"**, and show the 10 ground-truth questions passing with measurable **Citation Recall %** and **Zero-Hallucination Negative Constraint (TC-09)** adherence.
