from sqlalchemy import Column, String, Integer, Float, Boolean, JSON, DateTime, Text
from sqlalchemy.sql import func
from app.database import Base

class DBPolicy(Base):
    __tablename__ = "policies"
    id = Column(String, primary_key=True, index=True)
    policy_number = Column(String, unique=True, index=True)
    carrier = Column(String)
    product_name = Column(String)
    coverage_tier = Column(String)
    deductible = Column(String)
    has_zero_dep = Column(Boolean, default=True)
    vehicle = Column(JSON, nullable=True)
    status = Column(String, default="active")
    sum_insured = Column(String, nullable=True)
    active_claim_id = Column(String, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "policyNumber": self.policy_number,
            "carrier": self.carrier,
            "productName": self.product_name,
            "coverageTier": self.coverage_tier,
            "deductible": self.deductible,
            "hasZeroDep": self.has_zero_dep,
            "vehicle": self.vehicle,
            "status": self.status,
            "sumInsured": self.sum_insured,
            "activeClaimId": self.active_claim_id,
        }

class DBClaim(Base):
    __tablename__ = "claims"
    id = Column(String, primary_key=True, index=True)
    claim_number = Column(String, unique=True, index=True)
    policy_number = Column(String)
    vehicle = Column(String)
    policy_type = Column(String)
    insurer = Column(String, default="HDFC ERGO General Insurance Co.")
    status = Column(String, default="in_review")
    current_step = Column(Integer, default=1)
    progress_percent = Column(Integer, default=25)
    incident_date = Column(String, nullable=True)
    incident_location = Column(String, nullable=True)
    incident_description = Column(Text, nullable=True)
    damages = Column(JSON, default=list)
    estimated_amount = Column(Float, default=0.0)
    surveyor_name = Column(String, nullable=True, default=None)
    surveyor_phone = Column(String, nullable=True, default=None)
    workshop_name = Column(String, nullable=True, default=None)
    ai_analysis = Column(JSON, nullable=True)
    documents = Column(JSON, default=list)
    timeline = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "claimNumber": self.claim_number,
            "policyNumber": self.policy_number,
            "vehicle": self.vehicle,
            "policyType": self.policy_type,
            "insurer": self.insurer,
            "status": self.status,
            "currentStep": self.current_step,
            "progressPercent": self.progress_percent,
            "incidentDate": self.incident_date,
            "incidentLocation": self.incident_location,
            "incidentDescription": self.incident_description,
            "damages": self.damages or [],
            "estimatedAmount": self.estimated_amount,
            "surveyorName": self.surveyor_name,
            "surveyorPhone": self.surveyor_phone,
            "workshopName": self.workshop_name,
            "aiAnalysis": self.ai_analysis,
            "documents": self.documents or [],
            "timeline": self.timeline or [],
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }

class DBDocument(Base):
    __tablename__ = "documents"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    code = Column(String)
    category = Column(String, default="Motor")
    required = Column(Boolean, default=True)
    status = Column(String, default="missing")
    file_name = Column(String, nullable=True)
    file_size = Column(String, nullable=True)
    file_type = Column(String, nullable=True)
    diagnostic_score = Column(Float, default=0.0)
    readiness = Column(String, default="0% Pending")
    ocr_confidence = Column(Float, default=0.0)
    verified = Column(Boolean, default=False)
    discrepancy_alert = Column(String, nullable=True)
    extracted_fields = Column(JSON, default=dict)
    checklist = Column(JSON, default=list)
    notes = Column(String, nullable=True)
    description = Column(String, nullable=True)
    mandate_reason = Column(String, nullable=True)
    specimen_image_url = Column(String, nullable=True)
    uploaded_date = Column(String, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "category": self.category,
            "required": self.required,
            "status": self.status,
            "fileName": self.file_name,
            "fileSize": self.file_size,
            "fileType": self.file_type,
            "diagnosticScore": self.diagnostic_score,
            "readiness": self.readiness,
            "ocrConfidence": self.ocr_confidence,
            "verified": self.verified,
            "discrepancyAlert": self.discrepancy_alert,
            "extractedFields": self.extracted_fields or {},
            "checklist": self.checklist or [],
            "notes": self.notes,
            "description": self.description,
            "mandateReason": self.mandate_reason,
            "specimenImageUrl": self.specimen_image_url,
            "uploadedDate": self.uploaded_date,
        }

class DBChatHistory(Base):
    __tablename__ = "chat_history"
    id = Column(String, primary_key=True, index=True)
    claim_id = Column(String, index=True)
    sender = Column(String)
    text = Column(Text)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    metadata_json = Column(JSON, default=dict)

    def to_dict(self):
        return {
            "id": self.id,
            "claimId": self.claim_id,
            "sender": self.sender,
            "text": self.text,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "metadata": self.metadata_json or {},
        }

class DBIncidentConversion(Base):
    __tablename__ = "incident_conversions"
    id = Column(String, primary_key=True, index=True)
    input_narrative = Column(Text)
    extracted_claim_id = Column(String)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    metadata_json = Column(JSON, default=dict)

    def to_dict(self):
        return {
            "id": self.id,
            "inputNarrative": self.input_narrative,
            "extractedClaimId": self.extracted_claim_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "metadata": self.metadata_json or {},
        }

