export type ScreenType = 
  | 'home'
  | 'explore-claims'
  | 'document-library'
  | 'check-document'
  | 'ai-claim-pilot'
  | 'my-claims'
  | 'my-account';

export type ClaimJourneyStep = 1 | 2 | 3 | 4 | 'success';

export interface Policy {
  id: string;
  policyNumber: string;
  carrier: string;
  insurer?: string;
  productName: string;
  assetName?: string;
  vehicle?: {
    makeModel: string;
    registration: string;
    chassis: string;
  };
  coverageTier: string;
  status: 'active' | 'in-progress' | 'settled';
  deductible: string;
  hasZeroDep: boolean;
  activeClaimId?: string;
  sumInsured?: string;
}

export interface ClaimDocument {
  id: string;
  name: string;
  code: string;
  category: 'Motor' | 'Health' | 'Travel' | 'Life' | 'Personal Accident';
  required: boolean;
  status: 'verified' | 'pending' | 'missing' | 'warning';
  fileSize?: string;
  fileName?: string;
  fileType?: string;
  ocrConfidence?: number;
  uploadedDate?: string;
  description: string;
  mandateReason: string;
  specimenImageUrl?: string;
  notes?: string;
  verified?: boolean;
  discrepancyAlert?: string;
  readiness?: string;
  diagnosticScore?: number;
  ocrExtract?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  groundingContext?: {
    title: string;
    details: string;
    claimId?: string;
    stepNumber?: number | string;
  };
  suggestedQueries?: string[];
}
