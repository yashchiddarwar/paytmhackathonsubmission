import os
from pathlib import Path

# Base directory is claimease-root
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
CHROMA_DIR = DATA_DIR / "chroma_db"
WEIGHTS_DIR = BASE_DIR / "backend" / "weights"

# Resolve frontend dist directory
if (BASE_DIR / "frontend" / "dist").exists():
    FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
elif (BASE_DIR / "dist").exists():
    FRONTEND_DIST = BASE_DIR / "dist"
else:
    FRONTEND_DIST = BASE_DIR / "dist"

# Ensure runtime directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR.mkdir(parents=True, exist_ok=True)
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

SQLITE_URL = os.getenv("SQLITE_URL", f"sqlite:///{DATA_DIR / 'claimease.db'}")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
VLM_MODEL = os.getenv("VLM_MODEL", "llama3.2-vision:11b")
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5:7b")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")

KOKORO_MODEL_PATH = WEIGHTS_DIR / "kokoro-v0_19.onnx"
KOKORO_VOICES_PATH = WEIGHTS_DIR / "voices.bin"
