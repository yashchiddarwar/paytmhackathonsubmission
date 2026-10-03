import os
from pathlib import Path
from fastapi import FastAPI, Depends, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import FRONTEND_DIST, UPLOAD_DIR
from app.database import Base, engine, get_db, auto_migrate_sqlite
from app.models import DBClaim, DBDocument, DBPolicy, DBUser
from app.vector_store import seed_regulatory_knowledge
from app.api.claims import router as claims_router, seed_database_if_empty
from app.api.documents import router as documents_router
from app.api.copilot import router as copilot_router
from app.api.audio import router as audio_router
from app.api.auth import router as auth_router

# Initialize SQLite database schema & auto-migrate missing columns
Base.metadata.create_all(bind=engine)
auto_migrate_sqlite()

# Seed vector knowledge in ChromaDB
seed_regulatory_knowledge()

app = FastAPI(
    title="ClaimEase Autonomous Local Backend",
    description="FastAPI + Embedded SQLite + Local ChromaDB + Local Ollama (Qwen 2.5 & Llama 3.2 Vision) + TTS Audio",
    version="2.0.0"
)

# Enable CORS for local dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth_router)
app.include_router(claims_router)
app.include_router(documents_router)
app.include_router(copilot_router)
app.include_router(audio_router)

# ----------------- DATABASE DIAGNOSTICS & LIFECYCLE -----------------

@app.get("/api/db/status")
def get_db_status(db: Session = Depends(get_db)):
    seed_database_if_empty(db)
    claims_count = db.query(DBClaim).count()
    docs_count = db.query(DBDocument).count()
    policies_count = db.query(DBPolicy).count()
    active = db.query(DBClaim).filter(DBClaim.status != "submitted").order_by(DBClaim.created_at.desc()).first()
    return {
        "status": "connected",
        "type": "embedded_sqlite_chromadb",
        "totalClaims": claims_count,
        "totalDocuments": docs_count,
        "totalPolicies": policies_count,
        "activeClaimId": active.claim_number if active else None,
        "lastUpdated": active.updated_at.isoformat() if (active and active.updated_at) else None
    }

@app.post("/api/db/reset")
def reset_database_to_seed(db: Session = Depends(get_db)):
    # Clear claims
    db.query(DBClaim).delete()
    # Reset documents to initial state
    db.query(DBDocument).delete()
    db.query(DBPolicy).delete()
    seed_database_if_empty(db)
    return {"success": True, "message": "Database reset to canonical sample state."}

# ----------------- STATIC SPA SERVING -----------------

assets_dir = FRONTEND_DIST / "assets"
if assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        return Response(status_code=404)
    if (FRONTEND_DIST / "index.html").exists():
        candidate = FRONTEND_DIST / full_path
        if candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
    return {
        "name": "ClaimEase Autonomous Local Backend",
        "status": "online",
        "docs": "/docs",
        "models": {
            "llm": "Ollama / qwen2.5:7b",
            "vision": "Ollama / llama3.2-vision:11b",
            "embeddings": "Ollama / nomic-embed-text"
        },
        "audio": "/api/v1/tts/synthesize",
        "database": "SQLite + ChromaDB"
    }

