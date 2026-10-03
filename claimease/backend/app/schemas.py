from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field

class ChatRequest(BaseModel):
    message: str
    claimId: Optional[str] = None
    currentStep: Optional[Union[int, str]] = 2
    chatHistory: Optional[List[Dict[str, Any]]] = None

class GroundingContext(BaseModel):
    title: str = "IRDAI Grounded Copilot Verification"
    details: str
    claimId: str
    stepNumber: Optional[Union[int, str]] = 2

class ActionableItem(BaseModel):
    type: str
    target: str
    label: str

class ChatResponse(BaseModel):
    text: str
    groundingContext: GroundingContext
    suggestedQueries: List[str] = Field(default_factory=list)
    actionableItem: Optional[ActionableItem] = None

class IncidentRequest(BaseModel):
    narrative: str

class DiagnoseRequest(BaseModel):
    docId: str = "doc-custom"
    imageBase64: Optional[str] = None
    sampleType: Optional[str] = "clean"
    attachToClaim: Optional[bool] = False
    expectedDocType: Optional[str] = None

class AttachDocRequest(BaseModel):
    sampleType: Optional[str] = None
    score: Optional[float] = 96.0

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "af_heart"

class TranscribeRequest(BaseModel):
    audioBase64: str
    mimeType: Optional[str] = "audio/webm"

class ClaimCreate(BaseModel):
    claimNumber: Optional[str] = None
    policyNumber: Optional[str] = None
    vehicle: Optional[str] = None
    policyType: Optional[str] = None
    insurer: Optional[str] = None
    status: Optional[str] = "draft"
    currentStep: Optional[int] = 1
    progressPercent: Optional[int] = 25
    incidentDate: Optional[str] = None
    incidentLocation: Optional[str] = None
    incidentDescription: Optional[str] = None
    damages: Optional[List[str]] = Field(default_factory=list)
    estimatedAmount: Optional[float] = 65000.0
    surveyorName: Optional[str] = None
    surveyorPhone: Optional[str] = None
    workshopName: Optional[str] = None
    documents: Optional[List[Dict[str, Any]]] = None
    timeline: Optional[List[Dict[str, Any]]] = None

class ClaimUpdate(BaseModel):
    policyNumber: Optional[str] = None
    vehicle: Optional[str] = None
    policyType: Optional[str] = None
    insurer: Optional[str] = None
    status: Optional[str] = None
    currentStep: Optional[int] = None
    progressPercent: Optional[int] = None
    incidentDate: Optional[str] = None
    incidentLocation: Optional[str] = None
    incidentDescription: Optional[str] = None
    damages: Optional[List[str]] = None
    estimatedAmount: Optional[float] = None
    surveyorName: Optional[str] = None
    surveyorPhone: Optional[str] = None
    workshopName: Optional[str] = None
    documents: Optional[List[Dict[str, Any]]] = None
    timeline: Optional[List[Dict[str, Any]]] = None

class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    category: Optional[str] = None
    required: Optional[bool] = None
    status: Optional[str] = None
    fileName: Optional[str] = None
    fileSize: Optional[str] = None
    fileType: Optional[str] = None
    diagnosticScore: Optional[float] = None
    readiness: Optional[str] = None
    ocrConfidence: Optional[float] = None
    verified: Optional[bool] = None
    discrepancyAlert: Optional[str] = None
    extractedFields: Optional[Dict[str, Any]] = None
    checklist: Optional[List[Dict[str, Any]]] = None
    notes: Optional[str] = None
    description: Optional[str] = None
    mandateReason: Optional[str] = None
    specimenImageUrl: Optional[str] = None
