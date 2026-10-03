import { ClaimDocument, Policy, ClaimJourneyStep } from '../types';
import { DBClaim } from '../../server/db';

export function getAuthToken(): string | null {
  return localStorage.getItem('claimease_token');
}

export function authHeaders(customHeaders: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...(customHeaders as Record<string, string>) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchDbStatus() {
  try {
    const res = await fetch('/api/db/status');
    if (!res.ok) throw new Error('Failed to fetch DB status');
    return await res.json();
  } catch (err) {
    console.warn('DB status error:', err);
    return null;
  }
}

export async function resetDatabase() {
  const res = await fetch('/api/db/reset', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset DB');
  return await res.json();
}

export async function fetchDocuments(): Promise<ClaimDocument[]> {
  try {
    const res = await fetch('/api/documents');
    if (!res.ok) throw new Error('Failed to fetch documents');
    return await res.json();
  } catch (err) {
    console.warn('Falling back to local cache for documents:', err);
    return [];
  }
}

export async function fetchActiveClaim(): Promise<DBClaim | null> {
  try {
    const res = await fetch('/api/claims/active');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('Error fetching active claim:', err);
    return null;
  }
}

export async function clearAllClaims(): Promise<boolean> {
  try {
    const res = await fetch('/api/claims/clear', { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.warn('Error clearing claims:', err);
    return false;
  }
}

export async function seedSampleClaim(): Promise<DBClaim | null> {
  try {
    const res = await fetch('/api/claims/seed-sample', { method: 'POST' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.claim || null;
  } catch (err) {
    console.warn('Error seeding sample claim:', err);
    return null;
  }
}

export async function fetchClaims(): Promise<DBClaim[]> {
  try {
    const res = await fetch('/api/claims');
    if (!res.ok) throw new Error('Failed to fetch claims');
    return await res.json();
  } catch (err) {
    console.warn('Error fetching claims:', err);
    return [];
  }
}

export async function updateClaim(claimId: string, updates: Partial<DBClaim>): Promise<DBClaim | null> {
  try {
    const res = await fetch(`/api/claims/${claimId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update claim');
    return await res.json();
  } catch (err) {
    console.warn('Error updating claim:', err);
    return null;
  }
}


export async function sendClaimChatMessage(params: {
  message: string;
  claimId?: string;
  policyNumber?: string;
  noContext?: boolean;
  currentStep?: ClaimJourneyStep;
  chatHistory?: { role: 'user' | 'model'; text: string }[];
}): Promise<{
  text: string;
  groundingContext: {
    title: string;
    details: string;
    claimId?: string;
    stepNumber?: number | string;
  };
  suggestedQueries: string[];
  actionableItem?: {
    type: 'navigate' | 'check_doc' | 'resolve_discrepancy' | 'view_sample';
    target: string;
    label: string;
  };
}> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to communicate with AI Claim Pilot');
  }

  return await res.json();
}

export async function convertIncidentToJourney(narrative: string, policyNumber?: string): Promise<{
  success: boolean;
  claim: DBClaim;
  aiAnalysis: {
    detectedCategory: string;
    severity: 'minor' | 'moderate' | 'severe' | 'total_loss';
    damagesIdentified: string[];
    firRequired: boolean;
    firReason?: string;
    cashlessEligible: boolean;
    estimatedCostRange: { min: number; max: number };
    recommendedFirstStep: string;
    keyAdvice: string;
  };
}> {
  const res = await fetch('/api/ai/convert-incident', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ narrative, policyNumber })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to convert incident to claim journey');
  }

  return await res.json();
}

export async function diagnoseDocument(
  docId: string, 
  imageBase64?: string, 
  sampleType?: 'blurry' | 'clean' | 'hospital',
  attachToClaim?: boolean,
  expectedDocType?: string
): Promise<{
  score: number;
  readability: 'pass' | 'warning' | 'fail';
  ocrDetectedText: string;
  checklist: { label: string; passed: boolean; note: string }[];
  extractedFields: Record<string, string>;
  discrepancies: string[];
  recommendation: string;
  detectedDocType: string;
  isRecognizedClaimDoc?: boolean;
  updatedDocument?: any;
  activeClaim?: DBClaim | null;
}> {
  const res = await fetch('/api/ai/diagnose-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docId, imageBase64, sampleType, attachToClaim, expectedDocType })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to diagnose document');
  }

  return await res.json();
}

export async function attachDocumentToClaim(
  docId: string, 
  sampleType?: string, 
  score?: number
): Promise<{ success: boolean; document: any; claim: DBClaim | null }> {
  const res = await fetch(`/api/documents/${docId}/attach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleType, score })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to attach document to claim');
  }

  return await res.json();
}

export async function resetDemoDocuments(): Promise<{ success: boolean; documents: any[]; activeClaim: DBClaim | null }> {
  const res = await fetch('/api/documents/reset-demo', {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset demo documents');
  return await res.json();
}

export async function synthesizeTTS(text: string, voice = 'af'): Promise<Blob> {
  const res = await fetch('/api/v1/tts/synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice })
  });
  if (!res.ok) throw new Error('Failed to synthesize speech');
  return await res.blob();
}

export async function activateClaim(claimId: string): Promise<DBClaim | null> {
  try {
    const res = await fetch(`/api/claims/${claimId}/activate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to activate claim');
    return await res.json();
  } catch (err) {
    console.warn('Error activating claim:', err);
    return null;
  }
}

export async function fetchChatHistory(claimId?: string): Promise<any[]> {
  try {
    const url = claimId ? `/api/ai/chat/history?claim_id=${encodeURIComponent(claimId)}` : '/api/ai/chat/history';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch chat history');
    return await res.json();
  } catch (err) {
    console.warn('Error fetching chat history:', err);
    return [];
  }
}

export async function fetchIncidentConversions(): Promise<any[]> {
  try {
    const res = await fetch('/api/ai/incident-conversions');
    if (!res.ok) throw new Error('Failed to fetch incident conversions');
    return await res.json();
  } catch (err) {
    console.warn('Error fetching incident conversions:', err);
    return [];
  }
}

export async function clearChatHistory(claimId?: string): Promise<boolean> {
  try {
    const url = claimId ? `/api/ai/chat/history?claim_id=${encodeURIComponent(claimId)}` : '/api/ai/chat/history';
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('Error clearing chat history:', err);
    return false;
  }
}

export async function fetchPolicies(): Promise<Policy[]> {
  try {
    const res = await fetch('/api/policies');
    if (!res.ok) throw new Error('Failed to fetch policies');
    return await res.json();
  } catch (err) {
    console.warn('Error fetching policies:', err);
    return [];
  }
}

export async function createPolicy(policyData: Partial<Policy>): Promise<Policy | null> {
  try {
    const res = await fetch('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(policyData)
    });
    if (!res.ok) throw new Error('Failed to create policy');
    return await res.json();
  } catch (err) {
    console.warn('Error creating policy:', err);
    return null;
  }
}

export async function deletePolicy(policyId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/policies/${policyId}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('Error deleting policy:', err);
    return false;
  }
}




