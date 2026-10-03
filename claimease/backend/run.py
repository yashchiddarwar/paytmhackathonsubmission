import sys
from pathlib import Path
import uvicorn

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

if __name__ == "__main__":
    print("=" * 60)
    print("Starting ClaimEase Autonomous Local Backend on http://127.0.0.1:8000")
    print("API Documentation available at: http://127.0.0.1:8000/docs")
    print("Ollama Models: qwen2.5:7b (LLM) | llama3.2-vision:11b (Vision) | nomic-embed-text")
    print("TTS: Kokoro-ONNX / Windows SAPI local audio generator")
    print("Database: Embedded SQLite + Local ChromaDB PersistentClient")
    print("=" * 60)
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
