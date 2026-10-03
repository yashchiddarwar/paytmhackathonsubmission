# ClaimEase: Autonomous Local Insurance Copilot & Pre-Audit Intelligence

ClaimEase is a fully autonomous, offline-first insurance claims navigation, RAG-grounded copilot, pre-audit document analyzer, and real-time TTS platform.

Built with a unified architecture powered by:
- **Local LLMs & VLMs**: Ollama (`qwen2.5:7b` + `llama3.2-vision:11b`)
- **Semantic Retrieval**: Embedded ChromaDB with local `nomic-embed-text` embeddings
- **Relational & JSON Ledger**: Embedded SQLite database (`data/claimease.db`)
- **Sub-100ms Text-to-Speech**: Local Kokoro-ONNX synthesis engine + Windows SAPI fallback
- **Frontend SPA**: React 19 + TypeScript + TailwindCSS + Vite

---

## Quick Start Guide

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (3.10+)
- **Ollama** running locally (`http://localhost:11434`)

Pull the open-source models:
```bash
ollama pull qwen2.5:7b
ollama pull llama3.2-vision:11b
ollama pull nomic-embed-text
```

### 2. Backend Setup
Navigate to the `backend/` directory:
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

*(Optional)* Download TTS weights ahead of time (they will auto-download on first use if missing):
```bash
python download_weights.py
```

Start the FastAPI backend:
```bash
python run.py
```
*Backend runs on `http://localhost:8000`.*

### 3. Frontend Setup (Development Mode)
In a separate terminal at the project root:
```bash
npm install
npm run dev
```
*Vite will start on `http://localhost:3000` and automatically proxy all `/api` and `/ws` requests to `http://localhost:8000`.*

Alternatively, open `http://localhost:8000` directly in your browser—FastAPI natively serves the compiled production SPA from `dist/`!

---

## Architecture

- `backend/app/main.py`: Unified FastAPI server with CORS, static SPA mounting, REST & WebSocket routers.
- `backend/app/vector_store.py`: Embedded ChromaDB persistent client pre-seeded with statutory IRDAI guidelines (Rule 102, Motor Tariff GR-33, Section 64-VB, etc.).
- `backend/app/chains/`: LangChain orchestration for document audit, RAG claim pilot, and incident-to-journey conversion.
- `backend/app/core/tts_engine.py`: Kokoro-ONNX speech synthesizer generating WAV audio streams locally.
- `src/screens/`: React UI views for Claim Initiation, Pre-Audit Document Diagnostics, AI Claim Pilot Copilot, and Real-time Voice Audio.
