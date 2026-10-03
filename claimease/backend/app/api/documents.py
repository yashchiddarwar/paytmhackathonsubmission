import base64
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DBDocument, DBClaim
from app.schemas import DiagnoseRequest, AttachDocRequest, DocumentUpdate
from app.core.cv_health import analyze_image_health
from app.chains.doc_audit_chain import run_vlm_audit
from app.api.claims import seed_database_if_empty

router = APIRouter(tags=["Documents"])

@router.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):
    seed_database_if_empty(db)
    docs = db.query(DBDocument).all()
    return [d.to_dict() for d in docs]

@router.get("/api/documents/{doc_id}")
def get_document(doc_id: str, db: Session = Depends(get_db)):
    doc = db.query(DBDocument).filter(DBDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc.to_dict()

@router.post("/api/documents", status_code=201)
def add_document(payload: Dict[str, Any], db: Session = Depends(get_db)):
    doc_id = payload.get("id") or f"doc-custom-{len(db.query(DBDocument).all()) + 1}"
    new_doc = DBDocument(
        id=doc_id,
        name=payload.get("name", "Custom Document"),
        code=payload.get("code", "DOC-CUSTOM"),
        category=payload.get("category", "Motor"),
        required=payload.get("required", True),
        status=payload.get("status", "missing"),
        file_name=payload.get("fileName"),
        file_size=payload.get("fileSize", "1.5 MB"),
        file_type=payload.get("fileType", "PDF"),
        diagnostic_score=float(payload.get("diagnosticScore", 0.0)),
        readiness=payload.get("readiness", "0% Pending"),
        ocr_confidence=float(payload.get("ocrConfidence", 0.0)),
        verified=payload.get("verified", False),
        discrepancy_alert=payload.get("discrepancyAlert"),
        notes=payload.get("notes"),
        description=payload.get("description"),
        mandate_reason=payload.get("mandateReason")
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc.to_dict()

@router.put("/api/documents/{doc_id}")
def update_document(doc_id: str, payload: Dict[str, Any], db: Session = Depends(get_db)):
    doc = db.query(DBDocument).filter(DBDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    for key, val in payload.items():
        if key == "status":
            doc.status = val
        elif key == "verified":
            doc.verified = val
        elif key in ["diagnosticScore", "diagnostic_score"]:
            doc.diagnostic_score = float(val)
        elif key in ["ocrConfidence", "ocr_confidence"]:
            doc.ocr_confidence = float(val)
        elif key == "readiness":
            doc.readiness = val
        elif key in ["fileName", "file_name"]:
            doc.file_name = val
        elif key in ["fileSize", "file_size"]:
            doc.file_size = val
        elif key in ["discrepancyAlert", "discrepancy_alert"]:
            doc.discrepancy_alert = val
        elif key == "notes":
            doc.notes = val
        elif key in ["extractedFields", "extracted_fields"]:
            doc.extracted_fields = val
        elif key == "checklist":
            doc.checklist = val

    db.commit()
    db.refresh(doc)
    return doc.to_dict()

@router.post("/api/documents/{doc_id}/attach")
def attach_document_to_claim(doc_id: str, payload: AttachDocRequest, db: Session = Depends(get_db)):
    doc = db.query(DBDocument).filter(DBDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    score = payload.score or 96.0
    doc.status = "verified"
    doc.verified = True
    doc.diagnostic_score = score
    doc.ocr_confidence = score
    doc.readiness = "100% Ready"
    doc.discrepancy_alert = None
    doc.notes = "Verified by AI Pre-Audit and attached to claim dossier"

    active_claim = db.query(DBClaim).filter(DBClaim.status != "submitted").order_by(DBClaim.created_at.desc()).first()
    if not active_claim:
        # Create sample claim if none exists
        from app.api.claims import seed_sample_claim
        sample_res = seed_sample_claim(db)
        active_claim = db.query(DBClaim).filter(DBClaim.id == sample_res["claim"]["id"]).first()

    if active_claim:
        active_claim.progress_percent = min(100, max(active_claim.progress_percent or 50, 75) + 10)
        # Update claim's snapshot of documents
        docs_snapshot = active_claim.documents or []
        for d in docs_snapshot:
            if d.get("id") == doc_id:
                d["status"] = "verified"
                d["verified"] = True
                d["readiness"] = "100% Ready"
                d["diagnosticScore"] = score
        active_claim.documents = docs_snapshot

    db.commit()
    db.refresh(doc)
    if active_claim:
        db.refresh(active_claim)

    return {
        "success": True,
        "document": doc.to_dict(),
        "claim": active_claim.to_dict() if active_claim else None
    }

@router.post("/api/documents/reset-demo")
def reset_demo_documents(db: Session = Depends(get_db)):
    fir = db.query(DBDocument).filter(DBDocument.id == "doc-fir").first()
    if fir:
        fir.status = "warning"
        fir.verified = False
        fir.diagnostic_score = 41.0
        fir.ocr_confidence = 41.0
        fir.readiness = "41% Read"
        fir.file_name = "fir_scan_degraded.jpg"
        fir.file_size = "1.1 MB"
        fir.discrepancy_alert = "Stamp cropped and timestamp blurred (IRDAI Defect R-102)"
        fir.notes = "Defect notice R-102: Text resolution below 300 DPI"

    dl = db.query(DBDocument).filter(DBDocument.id == "doc-dl").first()
    if dl:
        dl.status = "verified"
        dl.verified = True
        dl.diagnostic_score = 99.0
        dl.ocr_confidence = 99.0
        dl.readiness = "100% Ready"
        dl.file_name = "driving_licence_smartcard.png"
        dl.file_size = "1.8 MB"
        dl.discrepancy_alert = None
        dl.notes = "Verified against Sarathi portal"

    # Remove temporary custom docs
    custom_docs = db.query(DBDocument).filter(DBDocument.id.like("doc-custom%")).all()
    for cd in custom_docs:
        db.delete(cd)

    db.commit()
    all_docs = db.query(DBDocument).all()
    active = db.query(DBClaim).filter(DBClaim.status != "submitted").first()
    return {
        "success": True,
        "documents": [d.to_dict() for d in all_docs],
        "activeClaim": active.to_dict() if active else None
    }

# --- AI DOCUMENT DIAGNOSTIC ENDPOINT ---

@router.post("/api/ai/diagnose-document")
def diagnose_document(req: DiagnoseRequest, db: Session = Depends(get_db)):
    doc_id = req.docId or "doc-custom"
    image_b64 = req.imageBase64 or ""
    sample_type = req.sampleType or "clean"
    expected_doc_type = req.expectedDocType or "general"

    # Decode binary image payload if present
    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]
    image_bytes = base64.b64decode(image_b64) if image_b64 else b""

    # 1. Deterministic blur check via OpenCV Laplacian variance
    cv_info = analyze_image_health(image_bytes) if image_bytes else {"blur_score": 90.0, "is_readable": True}

    # 2. VLM Forensic Audit using local Llama 3.2 Vision
    if image_bytes and cv_info.get("is_readable", True):
        vlm_res = run_vlm_audit(image_bytes, doc_hint=expected_doc_type)
        res_dict = vlm_res.model_dump()
    elif sample_type == "blurry" or not cv_info.get("is_readable", True):
        res_dict = {
            "score": 41,
            "readability": "warning",
            "detectedDocType": "FIR (First Information Report) — Station General Diary Entry",
            "isRecognizedClaimDoc": True,
            "checklist": [
                {"label": "File Format Supported", "passed": True, "note": "PDF/JPEG readable"},
                {"label": "Resolution & Text Legibility", "passed": False, "note": "DPI 96 detected. Minimum required is 300 DPI for statutory legal submission"},
                {"label": "Official Issuer Round Seal", "passed": False, "note": "Police station round rubber stamp is cropped off by 28% at bottom-right border"},
                {"label": "Incident Timestamp Verification", "passed": False, "note": "Accident timestamp blurred; surveyor cannot cross-verify against claim First Notice of Loss"},
                {"label": "IRDAI Anti-Fraud & CCTNS Clearance", "passed": False, "note": "High rejection probability (Defect Code R-102)"}
            ],
            "extractedFields": {
                "Police Station": "Koramangala Traffic PS (Partially Obscured)",
                "GD Diary Reference": "GD-882/2026/[Illegible]",
                "Incident Timestamp": "28-09-2026 ~16:?? hrs"
            },
            "discrepancies": [
                "The incident time and station diary registration number are degraded and cannot be authenticated.",
                "Official police station rubber stamp is partially cropped off the edge of the scan (Defect R-102)."
            ],
            "recommendation": "Submit a certified original copy to clear pre-audit."
        }
    else:
        vlm_res = run_vlm_audit(b"", doc_hint=expected_doc_type or doc_id)
        res_dict = vlm_res.model_dump()

    score = res_dict.get("score", 85)
    is_passing = score >= 80
    is_rejected = score == 0 or res_dict.get("isRecognizedClaimDoc") is False

    # 3. Persist audit outcome in SQLite database
    doc_record = db.query(DBDocument).filter(DBDocument.id == doc_id).first()
    if doc_record:
        doc_record.diagnostic_score = float(score)
        doc_record.status = "verified" if is_passing else "warning"
        doc_record.verified = is_passing
        doc_record.readiness = "100% Ready" if is_passing else (f"{score}% Read" if score > 0 else "0% Rejected")
        doc_record.ocr_confidence = float(score)
        doc_record.checklist = res_dict.get("checklist", [])
        doc_record.extracted_fields = res_dict.get("extractedFields", {})
        doc_record.notes = (
            f"Verified by Local Ollama Vision ({score}% confidence)"
            if is_passing
            else (
                f"IRDAI Pre-Audit REJECTED: {res_dict.get('discrepancies', ['Non-insurance image'])[0]}"
                if is_rejected
                else f"Defect flagged: {res_dict.get('discrepancies', ['Quality warning'])[0]}"
            )
        )
        if sample_type == "clean" and doc_id == "doc-fir":
            doc_record.file_name = "station_diary_gd882_certified.pdf"
            doc_record.file_size = "2.4 MB"
            doc_record.discrepancy_alert = None
        elif sample_type == "blurry" and doc_id == "doc-fir":
            doc_record.file_name = "fir_scan_degraded.jpg"
            doc_record.file_size = "1.1 MB"
            doc_record.discrepancy_alert = "Stamp cropped and timestamp blurred (IRDAI Defect R-102)"
        db.commit()
        db.refresh(doc_record)
    elif doc_id == "custom-doc" or doc_id.startswith("doc-custom"):
        # Register new custom document
        new_doc_id = doc_id if doc_id != "custom-doc" else f"doc-custom-{len(db.query(DBDocument).all()) + 1}"
        doc_record = DBDocument(
            id=new_doc_id,
            name=res_dict.get("detectedDocType", "Custom Inspected Document"),
            code="DOC-CUSTOM",
            category="Motor",
            required=True,
            status="verified" if is_passing else "warning",
            file_size="1.9 MB",
            file_name="uploaded_specimen.pdf",
            ocr_confidence=float(score),
            diagnostic_score=float(score),
            verified=is_passing,
            readiness="100% Ready" if is_passing else (f"{score}% Read" if score > 0 else "0% Rejected"),
            description="User uploaded specimen audited by Local Ollama Vision AI",
            mandate_reason="Forensic supporting evidence",
            notes="Passed optical and statutory check" if is_passing else "Manual surveyor review recommended",
            checklist=res_dict.get("checklist", []),
            extracted_fields=res_dict.get("extractedFields", {})
        )
        db.add(doc_record)
        db.commit()
        db.refresh(doc_record)

    # 4. Attach to claim if requested
    active_claim = db.query(DBClaim).filter(DBClaim.status != "submitted").first()
    if req.attachToClaim and is_passing and active_claim:
        active_claim.progress_percent = min(100, max(active_claim.progress_percent or 50, 75) + 10)
        active_claim.status = "in_review"
        db.commit()
        db.refresh(active_claim)

    return {
        **res_dict,
        "updatedDocument": doc_record.to_dict() if doc_record else None,
        "activeClaim": active_claim.to_dict() if active_claim else None
    }
