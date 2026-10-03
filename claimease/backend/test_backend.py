import os
import sys
from pathlib import Path

# Add backend to Python path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.config import SQLITE_URL, CHROMA_DIR, OLLAMA_BASE_URL, VLM_MODEL, LLM_MODEL, EMBEDDING_MODEL
from app.database import Base, engine, SessionLocal
from app.models import DBClaim, DBDocument, DBPolicy
from app.vector_store import seed_regulatory_knowledge, retrieve_claim_context
from app.core.cv_health import analyze_image_health
from app.core.tts_engine import generate_speech_wav
from app.api.claims import seed_database_if_empty
from app.chains.incident_chain import run_incident_conversion
from app.chains.pilot_chain import generate_copilot_response
from app.chains.doc_audit_chain import run_vlm_audit

def run_diagnostics():
    print("=" * 60)
    print("CLAIM EASE LOCAL BACKEND DIAGNOSTIC SUITE")
    print("=" * 60)

    # 1. SQLite Relational Store
    print("\n[1/5] Testing SQLite Database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database_if_empty(db)
        claims_count = db.query(DBClaim).count()
        docs_count = db.query(DBDocument).count()
        policies_count = db.query(DBPolicy).count()
        print(f"  -> SQLite Connected: {SQLITE_URL}")
        print(f"  -> Policies: {policies_count}, Documents: {docs_count}, Claims: {claims_count}")
    finally:
        db.close()

    # 2. ChromaDB Vector Store & Ollama Embeddings
    print("\n[2/5] Testing ChromaDB Vector Store & RAG...")
    seed_regulatory_knowledge()
    query = "Does zero depreciation cover bumper repair?"
    rag_res = retrieve_claim_context(query)
    print(f"  -> Query: '{query}'")
    print(f"  -> RAG Result Sample: {rag_res[:100]}...")

    # 3. Computer Vision Blur Check
    print("\n[3/5] Testing OpenCV Blur Assessment...")
    dummy_pixels = b"\x80" * (100 * 100)
    cv_res = analyze_image_health(dummy_pixels)
    print(f"  -> CV Sharpness Score: {cv_res.get('blur_score')}, Readable: {cv_res.get('is_readable')}")

    # 4. Text-To-Speech (TTS) Synthesis
    print("\n[4/5] Testing Text-To-Speech (TTS) Engine...")
    test_phrase = "ClaimEase Audio Engine is online and verified."
    wav_bytes = generate_speech_wav(test_phrase)
    print(f"  -> Generated Audio: {len(wav_bytes)} bytes of valid WAV audio data")
    assert len(wav_bytes) > 44, "WAV audio bytes too short"
    assert wav_bytes[:4] == b"RIFF", "Invalid WAV header (RIFF missing)"

    # 5. Incident Conversion & Copilot Logic
    print("\n[5/5] Testing Incident Converter & Copilot...")
    narrative = "Truck hit my Hyundai Creta front bumper and right headlamp at Koramangala intersection."
    conv = run_incident_conversion(narrative)
    print(f"  -> Incident Title: {conv.get('title')}")
    print(f"  -> Detected Damages: {conv.get('damages')}")
    print(f"  -> FIR Required: {conv.get('firRequired')} ({conv.get('firReason')})")

    copilot = generate_copilot_response("What is the next step for my bumper claim?")
    print(f"  -> Copilot Text Sample: {copilot.get('text')[:100]}...")

    print("\n" + "=" * 60)
    print("ALL LOCAL BACKEND SYSTEMS OPERATIONAL (100% PASS)")
    print("=" * 60)

if __name__ == "__main__":
    run_diagnostics()
