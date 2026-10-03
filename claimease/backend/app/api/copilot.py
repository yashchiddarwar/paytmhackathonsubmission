import json
import random
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db, SessionLocal
from app.models import DBClaim, DBChatHistory, DBPolicy
from app.schemas import ChatRequest, ChatResponse
from app.chains.pilot_chain import generate_copilot_response

router = APIRouter(tags=["Copilot"])

@router.get("/api/ai/chat/history")
def get_chat_history(claim_id: Optional[str] = None, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve stored chat interactions with AI Copilot, optionally filtered by claimId.
    """
    query = db.query(DBChatHistory)
    if claim_id:
        query = query.filter((DBChatHistory.claim_id == claim_id) | (DBChatHistory.claim_id == "general"))
    records = query.order_by(DBChatHistory.timestamp.asc()).limit(limit).all()
    return [r.to_dict() for r in records]

@router.delete("/api/ai/chat/history")
def clear_chat_history(claim_id: Optional[str] = None, db: Session = Depends(get_db)):
    """
    Clear stored chat interactions.
    """
    query = db.query(DBChatHistory)
    if claim_id:
        query = query.filter(DBChatHistory.claim_id == claim_id)
    query.delete(synchronize_session=False)
    db.commit()
    return {"message": "Chat history cleared successfully"}


@router.post("/api/ai/chat")
def chat_copilot(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Context-aware Copilot endpoint grounded with local ChromaDB RAG and Ollama LLM.
    """
    message = (req.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    # Resolve context: either specific claim, specific policy, or general (no context)
    claim = None
    policy = None
    if not req.noContext:
        if req.claimId and req.claimId not in ("general", "none"):
            claim = db.query(DBClaim).filter((DBClaim.id == req.claimId) | (DBClaim.claim_number == req.claimId)).first()
        
        if not claim and req.policyNumber and req.policyNumber not in ("none", "general"):
            policy = db.query(DBPolicy).filter(DBPolicy.policy_number == req.policyNumber).first()

    current_step = int(req.currentStep) if (req.currentStep and str(req.currentStep).isdigit()) else 2

    # Execute grounded copilot chain
    ai_result = generate_copilot_response(
        message=message,
        claim=claim,
        policy=policy,
        no_context=bool(req.noContext or (claim is None and policy is None)),
        current_step=current_step,
        chat_history=req.chatHistory
    )

    # Persist chat history in SQLite
    claim_id = claim.id if claim else (policy.policy_number if policy else "general")
    try:
        user_msg = DBChatHistory(
            id=f"msg-{random.randint(100000, 999999)}",
            claim_id=claim_id,
            sender="user",
            text=message,
            metadata_json={}
        )
        assistant_msg = DBChatHistory(
            id=f"msg-{random.randint(100000, 999999)}",
            claim_id=claim_id,
            sender="assistant",
            text=ai_result["text"],
            metadata_json={"grounding": ai_result.get("groundingContext")}
        )
        db.add_all([user_msg, assistant_msg])
        db.commit()
    except Exception as e:
        print(f"Could not persist chat message: {e}")

    return ai_result

@router.websocket("/ws/copilot")
async def websocket_copilot_endpoint(websocket: WebSocket):
    """
    Real-time WebSocket endpoint for AI Claim Pilot copilot conversation.
    """
    await websocket.accept()
    db = SessionLocal()
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
            except Exception:
                payload = {"message": data}

            message = payload.get("message", "")
            claim_id = payload.get("claimId")
            current_step = payload.get("currentStep", 2)

            claim = None
            if claim_id:
                claim = db.query(DBClaim).filter((DBClaim.id == claim_id) | (DBClaim.claim_number == claim_id)).first()
            if not claim:
                claim = db.query(DBClaim).filter(DBClaim.status != "submitted").first()

            result = generate_copilot_response(
                message=message,
                claim=claim,
                current_step=int(current_step) if str(current_step).isdigit() else 2
            )

            await websocket.send_text(json.dumps(result))
    except WebSocketDisconnect:
        pass
    except Exception as err:
        print(f"WebSocket error: {err}")
    finally:
        db.close()
