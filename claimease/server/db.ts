import fs from 'fs';
import path from 'path';
import { ClaimDocument, Policy, ClaimJourneyStep } from '../src/types';
import { MOCK_DOCUMENTS, MOCK_POLICIES } from '../src/data/mockData';

export interface DBClaim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  vehicle: string;
  policyType: string;
  insurer: string;
  status: 'draft' | 'in_review' | 'ready' | 'submitted' | 'approved';
  currentStep: ClaimJourneyStep;
  progressPercent: number;
  incidentDate: string;
  incidentLocation: string;
  incidentDescription: string;
  damages: string[];
  estimatedAmount: number;
  surveyorName?: string;
  surveyorPhone?: string;
  workshopName?: string;
  documents: ClaimDocument[];
  timeline: {
    title: string;
    description: string;
    timestamp: string;
    completed: boolean;
    current?: boolean;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  claims: DBClaim[];
  documents: ClaimDocument[];
  policies: Policy[];
  chatHistory: {
    id: string;
    claimId: string;
    sender: 'user' | 'assistant';
    text: string;
    timestamp: string;
    metadata?: any;
  }[];
  incidentConversions: {
    id: string;
    inputNarrative: string;
    extractedClaimId: string;
    timestamp: string;
    metadata: any;
  }[];
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DB_DIR, 'claim_database.json');

// Initial seed data: Brand new account with zero existing claims
const getInitialSeed = (): DatabaseSchema => {
  const initialDocuments = JSON.parse(JSON.stringify(MOCK_DOCUMENTS)).map((d: any) => ({
    ...d,
    status: 'missing',
    verified: false,
    discrepancyAlert: undefined,
    notes: undefined
  }));

  const initialPolicies = JSON.parse(JSON.stringify(MOCK_POLICIES)).map((p: any) => ({
    ...p,
    status: 'active',
    activeClaimId: undefined
  }));

  return {
    claims: [],
    documents: initialDocuments,
    policies: initialPolicies,
    chatHistory: [],
    incidentConversions: []
  };
};

class ClaimDatabase {
  private cache: DatabaseSchema | null = null;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (!fs.existsSync(DB_FILE)) {
        const seed = getInitialSeed();
        fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
        this.cache = seed;
      } else {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.cache = JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error initializing database, using in-memory fallback:', err);
      this.cache = getInitialSeed();
    }
  }

  private persist(): void {
    if (!this.cache) return;
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.cache, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to database file:', err);
    }
  }

  public resetToSeed(): DatabaseSchema {
    this.cache = getInitialSeed();
    this.persist();
    return this.cache;
  }

  public clearAllClaims(): DatabaseSchema {
    const data = this.getData();
    data.claims = [];
    data.chatHistory = [];
    data.incidentConversions = [];
    data.documents = data.documents.map(d => ({
      ...d,
      status: 'missing',
      verified: false,
      discrepancyAlert: undefined,
      notes: undefined,
      diagnosticScore: undefined
    }));
    this.persist();
    return data;
  }

  public seedSampleClaim(): DBClaim {
    return this.createClaim({
      claimNumber: 'MOT-8841-IN',
      policyNumber: 'HDFC-MOT-2024-88419',
      vehicle: '2022 Hyundai Creta SX(O) • KA-05-MK-9284',
      policyType: 'Motor Insurance — Accident Damage',
      insurer: 'HDFC ERGO General Insurance Co.',
      status: 'in_review',
      currentStep: 2,
      progressPercent: 75,
      incidentDate: '2026-09-28 16:45',
      incidentLocation: 'Outer Ring Road, Bengaluru',
      incidentDescription: 'Commercial truck grazed front right side at junction. Bumper cracked, headlamp damaged.',
      damages: ['Front Bumper Assembly', 'Right Headlamp Unit', 'Right Quarter Panel'],
      estimatedAmount: 84500
    });
  }

  public getData(): DatabaseSchema {
    if (!this.cache) {
      this.ensureInitialized();
    }
    return this.cache!;
  }

  // --- Claims CRUD ---
  public getClaims(): DBClaim[] {
    return this.getData().claims;
  }

  public getActiveClaim(): DBClaim | undefined {
    // Return active claim (in_review or draft, or first)
    const claims = this.getClaims();
    return claims.find(c => c.status === 'in_review') || claims[0];
  }

  public getClaimById(id: string): DBClaim | undefined {
    return this.getClaims().find(c => c.id === id || c.claimNumber === id);
  }

  public createClaim(claimData: Partial<DBClaim>): DBClaim {
    const data = this.getData();
    const newId = `claim-${Date.now().toString(36)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const claimNumber = claimData.claimNumber || `MOT-${randomSuffix}-IN`;

    const newClaim: DBClaim = {
      id: newId,
      claimNumber,
      policyNumber: claimData.policyNumber || 'HDFC-MOT-2024-88419',
      vehicle: claimData.vehicle || '2022 Hyundai Creta SX(O) • KA-05-MK-9284',
      policyType: claimData.policyType || 'Motor Insurance — Accident Damage',
      insurer: claimData.insurer || 'HDFC ERGO General Insurance Co.',
      status: claimData.status || 'draft',
      currentStep: claimData.currentStep || 1,
      progressPercent: claimData.progressPercent || 25,
      incidentDate: claimData.incidentDate || new Date().toISOString().slice(0, 16).replace('T', ' '),
      incidentLocation: claimData.incidentLocation || 'Bengaluru, Karnataka',
      incidentDescription: claimData.incidentDescription || '',
      damages: claimData.damages || [],
      estimatedAmount: claimData.estimatedAmount || 65000,
      surveyorName: claimData.surveyorName || 'Auto-Assigned Surveyor',
      surveyorPhone: claimData.surveyorPhone || '+91 98000 00000',
      workshopName: claimData.workshopName || 'Authorized Cashless Service Network',
      documents: claimData.documents && claimData.documents.length > 0 ? claimData.documents : JSON.parse(JSON.stringify(data.documents)),
      timeline: claimData.timeline || [
        {
          title: 'Incident Logged via AI Speech / Text',
          description: 'AI parsed incident narrative into statutory claim structure',
          timestamp: 'Just now',
          completed: true
        },
        {
          title: 'Document Assembly',
          description: 'Attach required photo proofs and vehicle documentation',
          timestamp: 'Current Step',
          completed: false,
          current: true
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Mark previous claims as inactive/historic if needed
    data.claims.unshift(newClaim);
    this.persist();
    return newClaim;
  }

  public updateClaim(id: string, updates: Partial<DBClaim>): DBClaim | null {
    const data = this.getData();
    const index = data.claims.findIndex(c => c.id === id || c.claimNumber === id);
    if (index === -1) return null;

    const existing = data.claims[index];
    const updated: DBClaim = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    data.claims[index] = updated;
    this.persist();
    return updated;
  }

  // --- Documents CRUD ---
  public getDocuments(): ClaimDocument[] {
    return this.getData().documents;
  }

  public getDocumentById(id: string): ClaimDocument | undefined {
    return this.getDocuments().find(d => d.id === id);
  }

  public updateDocument(id: string, updates: Partial<ClaimDocument>): ClaimDocument | null {
    const data = this.getData();
    const index = data.documents.findIndex(d => d.id === id);
    if (index === -1) return null;

    data.documents[index] = {
      ...data.documents[index],
      ...updates
    };

    // Also sync inside claims
    for (const claim of data.claims) {
      const docIdx = claim.documents?.findIndex(d => d.id === id);
      if (docIdx !== undefined && docIdx !== -1) {
        claim.documents[docIdx] = {
          ...claim.documents[docIdx],
          ...updates
        };
      }
    }

    this.persist();
    return data.documents[index];
  }

  public addDocument(doc: ClaimDocument): ClaimDocument {
    const data = this.getData();
    data.documents.unshift(doc);
    // sync to active claim
    if (data.claims[0]) {
      if (!data.claims[0].documents) data.claims[0].documents = [];
      data.claims[0].documents.unshift(doc);
    }
    this.persist();
    return doc;
  }

  // --- Policies ---
  public getPolicies(): Policy[] {
    return this.getData().policies;
  }

  // --- Chat Logs & Conversions ---
  public logChatMessage(claimId: string, sender: 'user' | 'assistant', text: string, metadata?: any) {
    const data = this.getData();
    const entry = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      claimId,
      sender,
      text,
      timestamp: new Date().toISOString(),
      metadata
    };
    data.chatHistory.push(entry);
    this.persist();
    return entry;
  }

  public logIncidentConversion(narrative: string, claimId: string, metadata: any) {
    const data = this.getData();
    const entry = {
      id: `conv-${Date.now()}`,
      inputNarrative: narrative,
      extractedClaimId: claimId,
      timestamp: new Date().toISOString(),
      metadata
    };
    data.incidentConversions.push(entry);
    this.persist();
    return entry;
  }
}

export const dbInstance = new ClaimDatabase();
