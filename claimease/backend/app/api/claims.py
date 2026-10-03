import random
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DBClaim, DBDocument, DBPolicy, DBIncidentConversion
from app.schemas import ClaimCreate, ClaimUpdate, IncidentRequest
from app.chains.incident_chain import run_incident_conversion

router = APIRouter(tags=["Claims"])

def get_initial_documents():
    return [
        {
            "id": "doc-fir",
            "name": "FIR (First Information Report)",
            "code": "DOC-FIR-01",
            "category": "Motor",
            "required": True,
            "status": "warning",
            "fileName": "fir_scan_degraded.jpg",
            "fileSize": "1.1 MB",
            "fileType": "PDF",
            "ocrConfidence": 41.0,
            "diagnosticScore": 41.0,
            "readiness": "41% Read",
            "verified": False,
            "discrepancyAlert": "Stamp cropped and timestamp blurred (IRDAI Defect R-102)",
            "notes": "Defect notice R-102: Text resolution below 300 DPI",
            "description": "Certified true copy of Police Station General Diary / First Information Report.",
            "mandateReason": "Mandatory under Indian Motor Tariff Section 154 for multi-vehicle road accidents."
        },
        {
            "id": "doc-dl",
            "name": "Driving Licence (Both Sides)",
            "code": "DOC-DL-02",
            "category": "Motor",
            "required": True,
            "status": "verified",
            "fileName": "driving_licence_smartcard.png",
            "fileSize": "1.8 MB",
            "fileType": "PNG",
            "ocrConfidence": 99.0,
            "diagnosticScore": 99.0,
            "readiness": "100% Ready",
            "verified": True,
            "notes": "Verified against Sarathi portal • LMV Match",
            "description": "Valid permanent driving licence of the person driving at the time of accident.",
            "mandateReason": "Statutory proof of legal qualification under Central Motor Vehicles Rules."
        },
        {
            "id": "doc-rc",
            "name": "Vehicle Registration Certificate (RC)",
            "code": "DOC-RC-03",
            "category": "Motor",
            "required": True,
            "status": "missing",
            "fileName": "rc_smartcard_form23.png",
            "fileSize": "2.2 MB",
            "fileType": "PDF",
            "ocrConfidence": 0.0,
            "diagnosticScore": 0.0,
            "readiness": "0% Pending",
            "verified": False,
            "description": "Smart card or digital Form 23 establishing vehicle ownership, chassis, and engine number.",
            "mandateReason": "Required to confirm insurable interest and vehicle identity."
        },
        {
            "id": "doc-estimate",
            "name": "Repair Estimate / Quotation",
            "code": "DOC-EST-04",
            "category": "Motor",
            "required": True,
            "status": "missing",
            "fileName": "Initial Repair Estimate (₹84,500).pdf",
            "fileSize": "1.2 MB",
            "fileType": "PDF",
            "ocrConfidence": 0.0,
            "diagnosticScore": 0.0,
            "readiness": "0% Pending",
            "verified": False,
            "description": "Itemized breakdown from an authorized cashless garage showing labor hours and paint expenses.",
            "mandateReason": "Establishes preliminary Loss Reserve to expedite surveyor sign-off."
        },
        {
            "id": "doc-photos",
            "name": "Vehicle Damage Photos (4 Angles)",
            "code": "VIS-PHOTO-05",
            "category": "Motor",
            "required": False,
            "status": "verified",
            "fileName": "damage_photos_pack.zip",
            "fileSize": "4.8 MB",
            "fileType": "ZIP",
            "ocrConfidence": 95.0,
            "diagnosticScore": 95.0,
            "readiness": "100% Ready",
            "verified": True,
            "description": "Multi-angle photographs capturing license plate, odometer, point of impact, and clear damage context.",
            "mandateReason": "Enables preliminary remote AI survey and pre-authorizes paint and panel replacement parts."
        },
        {
            "id": "doc-policy",
            "name": "Insurance Policy Schedule",
            "code": "INS-POL-06",
            "category": "Motor",
            "required": True,
            "status": "verified",
            "fileName": "HDFC_ERGO_Schedule_MOT9284.pdf",
            "fileSize": "620 KB",
            "fileType": "PDF",
            "ocrConfidence": 98.0,
            "diagnosticScore": 98.0,
            "readiness": "100% Ready",
            "verified": True,
            "description": "Confirms active policy tenure, premium clearance, zero depreciation endorsements, and deductible clauses.",
            "mandateReason": "Section 64-VB compliance requirement proving timely premium remittance."
        }
    ]

def seed_database_if_empty(db: Session):
    """Ensure database has initial policies and documents if starting clean."""
    if db.query(DBPolicy).count() == 0:
        p1 = DBPolicy(
            id="p-1",
            policy_number="MOT-9284-IN",
            carrier="HDFC ERGO General Insurance Co. Ltd.",
            product_name="Comprehensive Private Car Package",
            coverage_tier="Comprehensive B2B (Zero Depreciation)",
            deductible="₹1,000 Standard Compulsory",
            has_zero_dep=True,
            vehicle={
                "makeModel": "2022 Hyundai Creta SX(O) Turbo",
                "registration": "DL 01 AB 8392",
                "chassis": "MA3ERB4910884920B"
            },
            status="in-progress",
            active_claim_id="MOT-8841-IN"
        )
        p2 = DBPolicy(
            id="p-2",
            policy_number="HLT-4491-DEL",
            carrier="Care Health Insurance",
            product_name="Care Supreme Family Floater",
            coverage_tier="Cashless & Reimbursement (Global OPD)",
            deductible="Zero Co-Pay",
            has_zero_dep=False,
            sum_insured="₹15,00,000",
            status="active"
        )
        p3 = DBPolicy(
            id="p-3",
            policy_number="TRV-8820-24",
            carrier="Tata AIG General Insurance",
            product_name="Domestic Travel Guard",
            coverage_tier="Flight & Baggage Delay Shield",
            deductible="Nil",
            has_zero_dep=False,
            status="settled"
        )
        db.add_all([p1, p2, p3])
        db.commit()

    if db.query(DBDocument).count() == 0:
        docs = get_initial_documents()
        for d in docs:
            db_doc = DBDocument(
                id=d["id"],
                name=d["name"],
                code=d["code"],
                category=d.get("category", "Motor"),
                required=d.get("required", True),
                status=d.get("status", "missing"),
                file_name=d.get("fileName"),
                file_size=d.get("fileSize"),
                file_type=d.get("fileType"),
                diagnostic_score=d.get("diagnosticScore", 0.0),
                readiness=d.get("readiness", "0% Pending"),
                ocr_confidence=d.get("ocrConfidence", 0.0),
                verified=d.get("verified", False),
                discrepancy_alert=d.get("discrepancyAlert"),
                notes=d.get("notes"),
                description=d.get("description"),
                mandate_reason=d.get("mandateReason")
            )
            db.add(db_doc)
        db.commit()

# --- CLAIMS REST ENDPOINTS ---

@router.get("/api/claims")
def list_claims(db: Session = Depends(get_db)):
    seed_database_if_empty(db)
    claims = db.query(DBClaim).order_by(DBClaim.created_at.desc()).all()
    return [c.to_dict() for c in claims]

@router.get("/api/claims/active")
def get_active_claim(db: Session = Depends(get_db)):
    seed_database_if_empty(db)
    active = db.query(DBClaim).filter(DBClaim.status != "submitted").order_by(DBClaim.created_at.desc()).first()
    if not active:
        active = db.query(DBClaim).first()
    return active.to_dict() if active else None

@router.get("/api/claims/{claim_id}")
def get_claim(claim_id: str, db: Session = Depends(get_db)):
    seed_database_if_empty(db)
    claim = db.query(DBClaim).filter((DBClaim.id == claim_id) | (DBClaim.claim_number == claim_id)).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim.to_dict()

@router.post("/api/claims", status_code=201)
def create_claim(payload: ClaimCreate, db: Session = Depends(get_db)):
    seed_database_if_empty(db)
    random_num = random.randint(1000, 9999)
    claim_number = payload.claimNumber or f"MOT-{random_num}-IN"
    claim_id = f"claim-{random.randint(100000, 999999)}"

    # Default documents snapshot from database
    docs = [d.to_dict() for d in db.query(DBDocument).all()]

    new_claim = DBClaim(
        id=claim_id,
        claim_number=claim_number,
        policy_number=payload.policyNumber or "HDFC-MOT-2024-88419",
        vehicle=payload.vehicle or "2022 Hyundai Creta SX(O) • KA-05-MK-9284",
        policy_type=payload.policyType or "Motor Insurance — Accident Damage",
        insurer=payload.insurer or "HDFC ERGO General Insurance Co.",
        status=payload.status or "in_review",
        current_step=payload.currentStep or 1,
        progress_percent=payload.progressPercent or 25,
        incident_date=payload.incidentDate or "2026-09-28 16:45",
        incident_location=payload.incidentLocation or "Bengaluru, Karnataka",
        incident_description=payload.incidentDescription or "",
        damages=payload.damages or ["Front Bumper Assembly", "Right Headlamp Unit"],
        estimated_amount=payload.estimatedAmount or 75000.0,
        surveyor_name=payload.surveyorName or "IRDAI Empanelled Surveyor",
        surveyor_phone=payload.surveyorPhone or "+91 98450 12894",
        workshop_name=payload.workshopName or "Apex Multi-Brand Autoworks (Cashless Network #BLR-402)",
        documents=payload.documents if payload.documents is not None else docs,
        timeline=payload.timeline or [
            {
                "title": "Incident Logged via AI Speech / Text",
                "description": "AI parsed incident narrative into statutory claim structure",
                "timestamp": "Just now",
                "completed": True
            },
            {
                "title": "Document Assembly & Verification",
                "description": "Attach required photo proofs and vehicle documentation",
                "timestamp": "Current Stage",
                "completed": False,
                "current": True
            }
        ]
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim.to_dict()

@router.put("/api/claims/{claim_id}")
def update_claim(claim_id: str, payload: ClaimUpdate, db: Session = Depends(get_db)):
    claim = db.query(DBClaim).filter((DBClaim.id == claim_id) | (DBClaim.claim_number == claim_id)).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "policyNumber" in update_data:
        claim.policy_number = update_data["policyNumber"]
    if "vehicle" in update_data:
        claim.vehicle = update_data["vehicle"]
    if "policyType" in update_data:
        claim.policy_type = update_data["policyType"]
    if "insurer" in update_data:
        claim.insurer = update_data["insurer"]
    if "status" in update_data:
        claim.status = update_data["status"]
    if "currentStep" in update_data:
        claim.current_step = update_data["currentStep"]
    if "progressPercent" in update_data:
        claim.progress_percent = update_data["progressPercent"]
    if "incidentDate" in update_data:
        claim.incident_date = update_data["incidentDate"]
    if "incidentLocation" in update_data:
        claim.incident_location = update_data["incidentLocation"]
    if "incidentDescription" in update_data:
        claim.incident_description = update_data["incidentDescription"]
    if "damages" in update_data:
        claim.damages = update_data["damages"]
    if "estimatedAmount" in update_data:
        claim.estimated_amount = update_data["estimatedAmount"]
    if "surveyorName" in update_data:
        claim.surveyor_name = update_data["surveyorName"]
    if "surveyorPhone" in update_data:
        claim.surveyor_phone = update_data["surveyorPhone"]
    if "workshopName" in update_data:
        claim.workshop_name = update_data["workshopName"]
    if "documents" in update_data:
        claim.documents = update_data["documents"]
    if "timeline" in update_data:
        claim.timeline = update_data["timeline"]

    db.commit()
    db.refresh(claim)
    return claim.to_dict()

@router.post("/api/claims/clear")
def clear_claims(db: Session = Depends(get_db)):
    db.query(DBClaim).delete()
    # Reset documents to pending
    docs = db.query(DBDocument).all()
    for d in docs:
        d.status = "missing"
        d.verified = False
        d.discrepancy_alert = None
        d.notes = None
        d.diagnostic_score = 0.0
        d.readiness = "0% Pending"
    db.commit()
    return {"success": True, "message": "All claims cleared. Account is now brand new."}

@router.delete("/api/claims")
def delete_all_claims(db: Session = Depends(get_db)):
    return clear_claims(db)

@router.post("/api/claims/seed-sample")
def seed_sample_claim(db: Session = Depends(get_db)):
    seed_database_if_empty(db)
    # Check if sample claim already exists
    existing = db.query(DBClaim).filter(DBClaim.claim_number == "MOT-8841-IN").first()
    if existing:
        return {"success": True, "message": "Sample claim active.", "claim": existing.to_dict()}

    docs = [d.to_dict() for d in db.query(DBDocument).all()]
    sample = DBClaim(
        id=f"claim-seed-{random.randint(1000, 9999)}",
        claim_number="MOT-8841-IN",
        policy_number="HDFC-MOT-2024-88419",
        vehicle="2022 Hyundai Creta SX(O) • KA-05-MK-9284",
        policy_type="Motor Insurance — Accident Damage",
        insurer="HDFC ERGO General Insurance Co.",
        status="in_review",
        current_step=2,
        progress_percent=75,
        incident_date="2026-09-28 16:45",
        incident_location="Outer Ring Road, Bengaluru",
        incident_description="Commercial truck grazed front right side at junction. Bumper cracked, headlamp damaged.",
        damages=["Front Bumper Assembly", "Right Headlamp Unit", "Right Quarter Panel"],
        estimated_amount=84500.0,
        surveyor_name="Rajesh Kumar (IRDAI Surveyor #4829)",
        surveyor_phone="+91 98450 12894",
        workshop_name="Apex Multi-Brand Autoworks (Cashless Network #BLR-402)",
        documents=docs,
        timeline=[
            {
                "title": "Incident Logged via AI Speech / Text",
                "description": "AI parsed incident narrative into statutory claim structure",
                "timestamp": "28 Sep, 16:50",
                "completed": True
            },
            {
                "title": "Document Assembly & Verification",
                "description": "Cross-checking police GD entry and vehicle damage photos",
                "timestamp": "Current Stage",
                "completed": False,
                "current": True
            },
            {
                "title": "Pre-Submission Audit & Surveyor Pre-Check",
                "description": "Checking parts depreciation and deductible clauses",
                "timestamp": "Upcoming",
                "completed": False
            }
        ]
    )
    db.add(sample)
    db.commit()
    db.refresh(sample)
    return {"success": True, "message": "Sample claim seeded.", "claim": sample.to_dict()}

@router.get("/api/policies")
def list_policies(db: Session = Depends(get_db)):
    seed_database_if_empty(db)
    policies = db.query(DBPolicy).all()
    return [p.to_dict() for p in policies]

# --- AI INCIDENT TO CLAIM CONVERSION ENDPOINT ---

@router.post("/api/ai/convert-incident")
def convert_incident_endpoint(req: IncidentRequest, db: Session = Depends(get_db)):
    narrative = req.narrative.strip()
    if not narrative:
        raise HTTPException(status_code=400, detail="Incident narrative is required")

    seed_database_if_empty(db)
    policy = db.query(DBPolicy).first()

    # Run Ollama conversion chain
    parsed = run_incident_conversion(narrative, default_policy=policy)

    random_num = random.randint(1000, 9999)
    new_claim_number = f"MOT-{random_num}-IN"
    claim_id = f"claim-{random.randint(100000, 999999)}"

    # Get documents
    docs = [d.to_dict() for d in db.query(DBDocument).all()]
    for doc in docs:
        if doc["id"] == "doc-fir":
            doc["required"] = parsed.get("firRequired", True)
            if parsed.get("firRequired", True):
                doc["discrepancyAlert"] = parsed.get("firReason", "Police GD/FIR required due to multi-vehicle collision impact.")

    created = DBClaim(
        id=claim_id,
        claim_number=new_claim_number,
        policy_number=policy.policy_number if policy else "HDFC-MOT-2024-88419",
        vehicle="2022 Hyundai Creta SX(O) • KA-05-MK-9284",
        policy_type=parsed.get("incidentCategory", "Motor Insurance — Accident Damage"),
        insurer=policy.carrier if policy else "HDFC ERGO General Insurance Co.",
        status="in_review",
        current_step=1,
        progress_percent=35,
        incident_date=parsed.get("incidentDateStr", "2026-09-28 16:45"),
        incident_location=parsed.get("incidentLocation", "Bengaluru, Karnataka"),
        incident_description=parsed.get("summary", narrative),
        damages=parsed.get("damages", ["Front Bumper Assembly", "Right Headlamp Unit"]),
        estimated_amount=float(parsed.get("estimatedCost", 75000.0)),
        surveyor_name="IRDAI Empanelled Surveyor",
        surveyor_phone="+91 98450 12894",
        workshop_name="Apex Multi-Brand Autoworks (Cashless Network #BLR-402)",
        documents=docs,
        ai_analysis=parsed,
        timeline=[
            {
                "title": "Incident Voice / Text Converted to Claim",
                "description": f"AI converted narrative: \"{parsed.get('title', 'Accident Damage')}\"",
                "timestamp": "Just now",
                "completed": True
            },
            {
                "title": "Document Assembly & Verification",
                "description": "Upload required photos, DL, RC and FIR if applicable",
                "timestamp": "Current Stage",
                "completed": False,
                "current": True
            }
        ]
    )
    db.add(created)

    # Log conversion history
    db.add(DBIncidentConversion(
        id=f"conv-{random.randint(100000, 999999)}",
        input_narrative=narrative,
        extracted_claim_id=created.id,
        metadata_json=parsed
    ))

    db.commit()
    db.refresh(created)

    return {
        "success": True,
        "claim": created.to_dict(),
        "aiAnalysis": {
            "detectedCategory": parsed.get("incidentCategory", "Motor Insurance Accident Damage"),
            "severity": parsed.get("severity", "moderate"),
            "damagesIdentified": parsed.get("damages", ["Front Bumper Assembly", "Headlamp"]),
            "firRequired": parsed.get("firRequired", True),
            "firReason": parsed.get("firReason"),
            "cashlessEligible": True,
            "estimatedCostRange": {
                "min": int(float(parsed.get("estimatedCost", 75000.0)) * 0.85),
                "max": int(float(parsed.get("estimatedCost", 75000.0)) * 1.15)
            },
            "recommendedFirstStep": parsed.get("recommendedAction", "Upload damaged vehicle photos and station GD entry copy."),
            "keyAdvice": parsed.get("keyAdvice", "Do not dismantle broken parts before surveyor inspection photo evidence is logged.")
        }
    }
