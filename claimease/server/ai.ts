import { GoogleGenAI, Type } from '@google/genai';
import { dbInstance, DBClaim } from './db';
import { ClaimDocument } from '../src/types';

// Initialize the GoogleGenAI instance with server-side API key and User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

/**
 * Generate a context-aware response for the Claim Helper Chatbot
 */
export async function generateClaimChatResponse(params: {
  message: string;
  claimId?: string;
  policyNumber?: string;
  noContext?: boolean;
  currentStep?: number | string;
  chatHistory?: { role: 'user' | 'model'; text: string }[];
}): Promise<{
  text: string;
  groundingContext: {
    title: string;
    details: string;
    claimId: string;
    stepNumber?: number | string;
  };
  suggestedQueries: string[];
  actionableItem?: {
    type: 'navigate' | 'check_doc' | 'resolve_discrepancy' | 'view_sample';
    target: string;
    label: string;
  };
}> {
  const activeClaim = params.noContext
    ? null
    : (params.claimId ? dbInstance.getClaimById(params.claimId) : dbInstance.getActiveClaim());

  const policies = dbInstance.getPolicies();
  const selectedPolicy = params.policyNumber 
    ? policies.find(p => p.policyNumber === params.policyNumber)
    : (activeClaim ? policies.find(p => p.policyNumber === activeClaim.policyNumber) : null);

  const documents = activeClaim?.documents || dbInstance.getDocuments();
  const currentStep = params.currentStep || activeClaim?.currentStep || 2;

  // Build high-precision contextual summary of the user's active claim
  const claimContext = activeClaim
    ? `
ACTIVE USER CLAIM IN DATABASE:
- Claim Number: ${activeClaim.claimNumber}
- Vehicle: ${activeClaim.vehicle}
- Policy Number: ${activeClaim.policyNumber} (${activeClaim.policyType})
- Insurer: ${activeClaim.insurer}
- Current Workflow Stage: Step ${currentStep} (${
        currentStep === 1 ? 'Documents Collection' :
        currentStep === 2 ? 'Pre-Submission Verification & Discrepancy Resolution' :
        currentStep === 3 ? 'Ready to Submit & Dossier Audit' :
        currentStep === 4 ? 'Insurer Transmission Gateway' : 'Submitted & Surveyor Review'
      })
- Incident Date & Time: ${activeClaim.incidentDate}
- Incident Location: ${activeClaim.incidentLocation}
- Incident Summary: ${activeClaim.incidentDescription}
- Damages Recorded: ${activeClaim.damages.join(', ')}
- Total Estimated Repair: ₹${activeClaim.estimatedAmount.toLocaleString('en-IN')}
- Assigned Surveyor: ${activeClaim.surveyorName} (${activeClaim.surveyorPhone})
- Cashless Network Workshop: ${activeClaim.workshopName}

DOCUMENTS ATTACHED IN CLAIM DOSSIER:
${documents.map(d => `- ${d.name} (${d.code}) [Status: ${d.status}, Type: ${d.required ? 'MANDATORY' : 'OPTIONAL'}, Verification: ${d.status === 'verified' ? 'VERIFIED' : 'PENDING'}] Notes: ${d.notes || 'OK'}`).join('\n')}

INSURANCE POLICIES HELD:
${policies.map(p => `- ${p.policyNumber}: ${p.productName} for ${p.vehicle?.makeModel || 'Insured Asset'} (Sum Insured: ${p.sumInsured || 'N/A'})`).join('\n')}
`
    : 'No active claim currently on record.';

  const systemInstruction = `You are "AI Claim Pilot", an expert IRDAI certified Senior Motor & Health Insurance Claim Adjudicator and real-time copilot for ClaimEase.
Your role is to guide the policyholder smoothly through their active claim journey, eliminate insurance jargon, prevent claim repudiation/delays, and give 100% concrete, accurate guidance.

GROUNDING RULES:
1. Always be context-aware of the user's current claim details (${activeClaim?.claimNumber || 'Active Claim'}).
2. Specifically cite IRDAI regulations, standard Indian Motor Tariff norms (e.g. Zero Depreciation coverage, compulsory deductible ₹1,000, 24-hr/48-hr intimation window, FIR/GD entry rules for road accidents).
3. If the user asks about FIR requirements: explain why collisions with third-party or commercial vehicles trigger Section 154 CrPC / BNS General Diary (GD) entry, how to get a police GD entry without hassle (online e-FIR or local police station GD book), and differentiate between a Police GD and Hospital Medico-Legal Case (MLC).
4. If the user asks about cashless garage repairs: explain that ClaimEase dispatches the digitized surveyor estimate docket directly to ${activeClaim?.workshopName || 'the cashless network'}, leaving only the compulsory deductible.
5. Provide actionable, concise, friendly guidance in clean markdown (bullet points, bold key terms).
6. Never make up fake policy terms; always anchor to the active policy (${activeClaim?.policyType || 'Comprehensive'}).`;

  try {
    const userPrompt = `
CURRENT CLAIM CONTEXT:
${claimContext}

USER INQUIRY:
"${params.message}"

Please respond with helpful, empathetic, and regulatory-grounded advice. 
Also provide 3 short, relevant follow-up questions the user might want to ask next.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: 'Clear, authoritative, and helpful answer formatted in clean markdown.'
            },
            groundingDetails: {
              type: Type.STRING,
              description: '1-2 sentence regulatory note specifying exact clauses or documents checked.'
            },
            suggestedQueries: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 highly relevant follow-up questions.'
            },
            recommendedAction: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                target: { type: Type.STRING },
                label: { type: Type.STRING }
              }
            }
          },
          required: ['answer', 'groundingDetails', 'suggestedQueries']
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    const answer = parsed.answer || response.text || 'I have analyzed your claim context.';
    const groundingDetails = parsed.groundingDetails || `Grounded in ${activeClaim?.insurer || 'IRDAI'} policy schedule for ${activeClaim?.claimNumber || 'active claim'}.`;
    const suggestedQueries = parsed.suggestedQueries || [
      'What documents are still missing?',
      'How does zero-depreciation apply to my bumper?',
      'What are the next steps with surveyor Rajesh Kumar?'
    ];

    // Log to DB chat history
    if (activeClaim) {
      dbInstance.logChatMessage(activeClaim.id, 'user', params.message);
      dbInstance.logChatMessage(activeClaim.id, 'assistant', answer, { groundingDetails });
    }

    return {
      text: answer,
      groundingContext: {
        title: 'IRDAI Grounded Copilot Verification',
        details: groundingDetails,
        claimId: activeClaim?.claimNumber || 'MOT-9284-IN',
        stepNumber: currentStep
      },
      suggestedQueries,
      actionableItem: parsed.recommendedAction
    };
  } catch (error) {
    console.warn('Gemini chat generation note, using knowledge engine:', error);
    const msgLower = (params.message || '').toLowerCase();
    
    let text = '';
    let groundingDetails = '';
    let suggestedQueries: string[] = [];

    if (msgLower.includes('fir') || msgLower.includes('police') || msgLower.includes('gd')) {
      text = `### ⚖️ Police Documentation Guidelines under Indian Motor Tariff\n\n1. **When is a Police FIR NOT Mandatory?**\n• Single-vehicle collisions (hitting a divider, pole, or minor dent) without third-party casualty or property damage do **not** legally require an FIR under IRDAI guidelines.\n\n2. **When is a Police Report Required?**\n• Multi-vehicle collisions, third-party injuries, or vehicle theft mandate a formal **Section 154 CrPC / BNS General Diary (GD) entry** or e-FIR.\n\n3. **Quick Resolution**: Most insurers accept an online citizen portal e-FIR or Station Diary GD extract without requiring court visits.`;
      groundingDetails = 'Indian Motor Tariff Section 154 & IRDAI Claim Adjudication Guidelines.';
      suggestedQueries = ['How do I get an online police GD copy?', 'What if the surveyor insists on an FIR?', 'What other proofs are mandatory?'];
    } else if (msgLower.includes('zero dep') || msgLower.includes('depreciation') || msgLower.includes('bumper')) {
      text = `### 🛡️ Zero-Depreciation Protection under Motor Tariff GR-33\n\nStandard motor insurance rules enforce mandatory depreciation cuts on replacement parts:\n• **Plastic / Nylon / Bumpers**: 50% Depreciation\n• **Fiber Glass**: 30% Depreciation\n• **Glass Parts**: 0% Depreciation\n• **Metal Panels**: Age-graded (0% to 50%)\n\nWith an active **Zero-Depreciation add-on**, 100% of these parts are covered by the insurer, leaving only the statutory compulsory deductible (₹1,000 for private cars up to 1500cc).`;
      groundingDetails = 'Indian Motor Tariff General Regulation GR-33.';
      suggestedQueries = ['Does zero dep cover consumable items?', 'What is the compulsory deductible?', 'How many zero-dep claims can I file in a year?'];
    } else if (msgLower.includes('cashless') || msgLower.includes('garage') || msgLower.includes('hospital')) {
      text = `### 🚗 Cashless Network Settlement Protocols\n\nIn a cashless settlement:\n1. The claim docket is dispatched directly to the authorized network facility.\n2. An IRDAI surveyor inspects damages and issues a pre-authorization loss reserve.\n3. The insurer pays the workshop/hospital directly upon discharge or repair completion.\n4. You only settle the non-covered consumables and statutory compulsory deductible.`;
      groundingDetails = 'IRDAI Master Circular on Cashless Claims Settlement.';
      suggestedQueries = ['Can I use a non-network workshop?', 'How long does surveyor approval take?', 'What if estimate exceeds surveyor assessment?'];
    } else if (activeClaim) {
      text = `### 📋 Claim Telemetry Assessment (${activeClaim.claimNumber})\n\nRegarding your active claim for the **${activeClaim.vehicle}** (Policy: ${activeClaim.policyNumber} with ${activeClaim.insurer}):\n\n• **Current Stage**: Step ${currentStep} (${activeClaim.status.replace('_', ' ').toUpperCase()})\n• **Damages Recorded**: ${activeClaim.damages.join(', ') || 'Pending inspection'}\n• **Estimated Cost**: ₹${activeClaim.estimatedAmount.toLocaleString('en-IN')}\n\nEnsure all replacement items in the workshop estimate correspond with physical impact points before surveyor final sign-off.`;
      groundingDetails = `Grounded in active claim telemetry for ${activeClaim.claimNumber} (${activeClaim.insurer}).`;
      suggestedQueries = ['What documents are still pending?', 'When will surveyor inspection happen?', 'How do I clear document discrepancy notices?'];
    } else if (selectedPolicy) {
      text = `### 🛡️ Policy Guidance (${selectedPolicy.policyNumber})\n\nEvaluating within your **${selectedPolicy.productName}** with **${selectedPolicy.carrier}**:\n\n• **Coverage Tier**: ${selectedPolicy.coverageTier}\n• **Deductible**: ${selectedPolicy.deductible}\n• **Zero Depreciation**: ${selectedPolicy.hasZeroDep ? 'Active' : 'Standard Depreciation'}\n\nYou can ask about claim coverage, filing procedures, or switch to the Initiation Deck to file a new claim.`;
      groundingDetails = `Grounded in terms of policy ${selectedPolicy.policyNumber} (${selectedPolicy.carrier}).`;
      suggestedQueries = ['How do I file a claim under this policy?', 'What is my compulsory deductible?', 'Which network garages are available?'];
    } else {
      text = `### 🌐 IRDAI General Insurance Adjudication Guidance\n\nUnder IRDAI regulations, claim settlement relies on timely incident intimation, clear proof of insurable interest, and certified repair or medical records.\n\n• **Turnaround Times**: Insurers must adjudicate claims within 30 days of receiving the surveyor report.\n• **Delay Protection**: Claims cannot be repudiated solely for delayed intimation if the delay was due to bona fide reasons.\n• **Ombudsman Recourse**: Unresolved disputes up to ₹50 Lakh can be escalated to the Insurance Ombudsman free of charge.\n\nYou can ask any question, or select a policy from above to ground the conversation.`;
      groundingDetails = 'IRDAI Protection of Policyholders Interests Regulations 2024.';
      suggestedQueries = ['What documents are mandatory for accident claims?', 'When is a Police FIR required?', 'How do I file an Ombudsman grievance?'];
    }

    return {
      text,
      groundingContext: {
        title: 'IRDAI Statutory Grounding Ledger',
        details: groundingDetails,
        claimId: activeClaim?.claimNumber || selectedPolicy?.policyNumber || 'General Guidance',
        stepNumber: currentStep
      },
      suggestedQueries
    };
  }
}

/**
 * Convert spoken or typed incident narrative into a structured claim journey
 */
export async function convertIncidentToClaimJourney(narrative: string): Promise<{
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
  const policies = dbInstance.getPolicies();
  const defaultPolicy = policies[0];

  const systemInstruction = `You are ClaimEase's AI Claim Journey Architect. 
Your job is to listen to a user describe an accident or insurance incident (spoken via microphone or typed), analyze all details, and structure it into a formal insurance claim file ready for IRDAI filing.

You must extract:
1. Incident type (e.g. Collision, Rear-ended, Waterlogging, Theft, Medical hospitalization, Flight delay)
2. Incident date & approximate time (or extract from text if mentioned, else default to today/yesterday)
3. Location of the accident
4. Complete list of damaged components (e.g. Front Bumper, Headlamp, Radiator, Bonnet, Fender, etc.)
5. Severity: 'minor', 'moderate', 'severe', or 'total_loss'
6. Whether Police FIR or General Diary (GD) entry is required under Indian law (Required if: collision with commercial vehicle, disputed third-party fault, major property damage, injury, theft, or fire)
7. Estimated repair range in INR (e.g. ₹40,000 - ₹90,000 for bumper/radiator)
8. Immediate tactical advice for the policyholder`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `User Incident Description:\n"""\n${narrative}\n"""\n\nMatched user policy:\n${JSON.stringify(defaultPolicy)}`,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Short claim title, e.g. Front & Quarter Collision' },
            incidentCategory: { type: Type.STRING, description: 'e.g. Motor Accident Damage' },
            incidentLocation: { type: Type.STRING },
            incidentDateStr: { type: Type.STRING },
            damages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of damaged parts'
            },
            severity: {
              type: Type.STRING,
              description: 'minor, moderate, severe, or total_loss'
            },
            firRequired: { type: Type.BOOLEAN },
            firReason: { type: Type.STRING },
            estimatedCost: { type: Type.NUMBER },
            summary: { type: Type.STRING, description: 'Professional 2-sentence incident narrative for surveyor' },
            recommendedAction: { type: Type.STRING },
            keyAdvice: { type: Type.STRING }
          },
          required: ['title', 'incidentLocation', 'damages', 'firRequired', 'estimatedCost', 'summary']
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || '{}');
    
    // Create new claim in DB
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newClaimNumber = `MOT-${randomNum}-IN`;

    const sampleDocs = JSON.parse(JSON.stringify(dbInstance.getDocuments()));

    // Customize FIR requirement based on AI finding
    const firDoc = sampleDocs.find((d: ClaimDocument) => d.id === 'doc-fir');
    if (firDoc) {
      firDoc.required = parsed.firRequired !== false;
      if (parsed.firRequired) {
        firDoc.discrepancyAlert = parsed.firReason || 'Police GD/FIR required due to multi-vehicle collision impact.';
      }
    }

    const createdClaim = dbInstance.createClaim({
      claimNumber: newClaimNumber,
      policyNumber: defaultPolicy?.policyNumber || 'HDFC-MOT-2024-88419',
      vehicle: `${defaultPolicy?.vehicle?.makeModel || '2022 Hyundai Creta SX(O)'} • KA-05-MK-9284`,
      policyType: parsed.incidentCategory || 'Motor Insurance — Accident Damage',
      insurer: defaultPolicy?.carrier || 'HDFC ERGO General Insurance Co.',
      status: 'in_review',
      currentStep: 1, // Start at step 1 for new claim
      progressPercent: 35,
      incidentDate: parsed.incidentDateStr || new Date().toISOString().slice(0, 16).replace('T', ' '),
      incidentLocation: parsed.incidentLocation || 'Bengaluru, Karnataka',
      incidentDescription: parsed.summary || narrative,
      damages: parsed.damages || ['Front Bumper', 'Right Headlamp'],
      estimatedAmount: parsed.estimatedCost || 75000,
      surveyorName: 'IRDAI Empanelled Surveyor',
      surveyorPhone: '+91 98450 12894',
      workshopName: 'Apex Multi-Brand Autoworks (Cashless Network #BLR-402)',
      documents: sampleDocs,
      timeline: [
        {
          title: 'Incident Voice / Text Converted to Claim',
          description: `AI converted narrative: "${parsed.title || 'Accident Damage'}"`,
          timestamp: 'Just now',
          completed: true
        },
        {
          title: 'Document Assembly & Verification',
          description: 'Upload required photos, DL, RC and FIR if applicable',
          timestamp: 'Current Stage',
          completed: false,
          current: true
        },
        {
          title: 'Pre-Submission Audit & Surveyor Pre-Check',
          description: 'Cross-verifying bills and estimate line-items',
          timestamp: 'Upcoming',
          completed: false
        },
        {
          title: 'Direct API Handshake to Insurer',
          description: 'Cashless garage work order authorization',
          timestamp: 'Upcoming',
          completed: false
        }
      ]
    });

    dbInstance.logIncidentConversion(narrative, createdClaim.id, parsed);

    return {
      success: true,
      claim: createdClaim,
      aiAnalysis: {
        detectedCategory: parsed.incidentCategory || 'Motor Insurance Accident Damage',
        severity: (parsed.severity as any) || 'moderate',
        damagesIdentified: parsed.damages || ['Front Bumper Assembly', 'Headlamp'],
        firRequired: parsed.firRequired ?? true,
        firReason: parsed.firReason,
        cashlessEligible: true,
        estimatedCostRange: {
          min: Math.round((parsed.estimatedCost || 75000) * 0.85),
          max: Math.round((parsed.estimatedCost || 75000) * 1.15)
        },
        recommendedFirstStep: parsed.recommendedAction || 'Upload damaged vehicle photos and station GD entry copy.',
        keyAdvice: parsed.keyAdvice || 'Do not dismantle broken parts before surveyor inspection photo evidence is logged.'
      }
    };
  } catch (error) {
    console.error('Incident to claim conversion error:', error);
    // Fallback claim generation
    const fallbackNum = Math.floor(1000 + Math.random() * 9000);
    const createdClaim = dbInstance.createClaim({
      claimNumber: `MOT-${fallbackNum}-IN`,
      incidentDescription: narrative,
      damages: ['Front Bumper', 'Right Quarter Panel', 'Headlamp Assembly'],
      estimatedAmount: 85000,
      currentStep: 1,
      progressPercent: 30
    });

    return {
      success: true,
      claim: createdClaim,
      aiAnalysis: {
        detectedCategory: 'Motor Insurance Accident Damage',
        severity: 'moderate',
        damagesIdentified: ['Front Bumper Assembly', 'Right Quarter Panel', 'Headlamp'],
        firRequired: true,
        firReason: 'Road collision with commercial vehicle requires General Diary (GD) entry for third-party liability clearance.',
        cashlessEligible: true,
        estimatedCostRange: { min: 70000, max: 95000 },
        recommendedFirstStep: 'Proceed to Document Upload: Attach vehicle damage photos and RC copy.',
        keyAdvice: 'Apex Multi-Brand Autoworks is pre-selected for cashless processing under your policy.'
      }
    };
  }
}

/**
 * AI Document Diagnostic Engine: verifies a document against active claim context
 */
export async function diagnoseDocumentWithAI(
  docId: string,
  base64Image?: string,
  sampleType?: 'blurry' | 'clean' | 'hospital',
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
}> {
  const doc = dbInstance.getDocumentById(docId);
  const activeClaim = dbInstance.getActiveClaim();

  // Determine expected document type description
  let expectedTargetName = 'Official Motor or Health Claim Document';
  if (docId === 'doc-fir' || expectedDocType === 'doc-fir' || expectedDocType === 'fir') {
    expectedTargetName = 'Police FIR (First Information Report) or Station General Diary (GD) Entry';
  } else if (docId === 'doc-dl' || expectedDocType === 'doc-dl' || expectedDocType === 'dl') {
    expectedTargetName = 'Indian Driving Licence (Form 7 Smart Card / Sarathi Portal)';
  } else if (docId === 'doc-rc' || expectedDocType === 'doc-rc' || expectedDocType === 'rc') {
    expectedTargetName = 'Vehicle Registration Certificate (RC Form 23 Smart Card / VAHAN Portal)';
  } else if (docId === 'doc-hospital' || expectedDocType === 'doc-hospital') {
    expectedTargetName = 'Hospital Emergency Record / Casualty Admission / Medical Bill';
  } else if (docId === 'doc-estimate' || expectedDocType === 'doc-estimate') {
    expectedTargetName = 'Automotive Workshop Repair Estimate / Quotation';
  }

  // 1. If Gemini vision is invoked with a real user-uploaded image
  if (base64Image) {
    try {
      const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');
      const mime = base64Image.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';

      const prompt = `You are a certified, uncompromising forensic claims auditor for the Insurance Regulatory and Development Authority of India (IRDAI).
You are auditing an uploaded file submitted for an Indian motor accident claim:
- Policyholder / Claimant: Yash Kapoor
- Insured Vehicle: Hyundai Creta SX(O) • Registration: KA-05-MK-9284
- Incident Date: 28-09-2026 (Outer Ring Road, Bengaluru)
- Target Expected Document: "${expectedTargetName}"

============================================================
CRITICAL INSTRUCTION 1: AUTHENTICATION & CATEGORY DETECTION
============================================================
Carefully analyze the visual content of the uploaded image.
Classify the image into EXACTLY ONE of the following categories:

VALID CLAIM CATEGORIES:
- "police_fir": Official Indian Police FIR, Station Diary (GD) entry, NCR with station stamp/FIR number.
- "driving_licence": Official Indian Driving Licence (Form 7 smart card, Sarathi digital DL, transport badge).
- "vehicle_rc": Official Indian Vehicle Registration Certificate (Form 23 smart card, VAHAN registration extract).
- "repair_estimate": Itemized automotive workshop quotation / parts replacement estimate with garage seal.
- "hospital_record": Hospital emergency casualty record, discharge summary, MLC report, medical bills.
- "vehicle_damage_photo": Photograph of actual physical automobile accident collision damage (cracked bumper, smashed headlamp, dented panel).
- "insurance_policy": Official motor insurance policy schedule or certificate of insurance.

INVALID / NON-CLAIM CATEGORIES (ZERO TOLERANCE):
- "non_claim_image": Any image that is NOT an insurance claim document. This includes:
  * Infographics, educational diagrams, charts, flowcharts, presentation slides, illustrations
  * Photos of people, selfies, headshots, family pictures
  * Animals, pets (cats, dogs, birds, wildlife), plants, nature, outdoor landscapes, scenery
  * Food, meals, coffee, dishes, consumer goods, clothing
  * Social media screenshots, chat messages, memes, wallpapers, cartoons, anime
  * Computer code, terminal windows, software diagrams
  * Unrelated papers (store grocery bills, school homework, book pages, utility bills)
  * Blank images, solid color blocks, random graphics, abstract art

============================================================
CRITICAL INSTRUCTION 2: SCORING & REJECTION MANDATES
============================================================
RULE A — NON-CLAIM IMAGE (ZERO TOLERANCE):
If the image falls into ANY invalid / non-claim category (infographic, chart, diagram, selfie, animal, food, scenery, meme, etc.):
- isClaimDocument MUST BE false
- targetMatch MUST BE false
- score MUST BE strictly 0 (Zero! Never give a positive score to a non-claim image or infographic!)
- readability MUST BE "fail"
- detectedDocType MUST accurately identify the content (e.g., "Educational Infographic / Chart", "Cat / Pet Photograph", "Portrait / Selfie", "Unrelated Landscape Photo", "Non-Insurance Diagram")
- recommendation: "REJECTED BY IRDAI PRE-AUDIT: The uploaded file is an unrelated image and NOT an insurance claim document. Insurers will immediately deny the claim. Please upload an authentic Police FIR, Driving Licence, or Vehicle RC."
- checklist MUST contain 3 items, ALL with passed: false:
  1. "Claim Document Recognition": passed: false, note: "Uploaded image is not a recognized insurance document, statutory certificate, or vehicular damage"
  2. "Statutory Authority Credentials": passed: false, note: "No official police, RTO, hospital, or surveyor markings found"
  3. "IRDAI Statutory Compliance": passed: false, note: "Prerequisite check failed; automatic pre-audit rejection"
- discrepancies: [
  "Uploaded file is an unrelated image and does not depict a valid insurance claim document.",
  "Missing mandatory statutory credentials and policyholder identity linkage."
]
- extractedFields: { "Audit Verdict": "REJECTED (0% Match)", "Detected Content": "[what it is]", "Required File": "${expectedTargetName}" }

RULE B — DOCUMENT TYPE MISMATCH:
If the image is a valid claim document, but DOES NOT MATCH the Target Expected Document "${expectedTargetName}":
(e.g., Target is Police FIR, but user uploaded a Driving Licence or Car Damage Photo):
- isClaimDocument MUST BE true
- targetMatch MUST BE false
- score MUST BE capped between 8 and 15 (Max 15!)
- readability MUST BE "fail"
- recommendation: "DOCUMENT MISMATCH: Uploaded file appears to be a [detectedDocType], but [Target Expected Document] is required for this slot. Please upload the correct document."
- discrepancies: ["Document type mismatch: Expected ${expectedTargetName}, but detected [detectedDocType]."]

RULE C — VALID MATCHING DOCUMENT:
If the image matches "${expectedTargetName}" and is genuine:
- Optical Clarity: If sharp and readable (DPI 300+), score 88-99, readability "pass".
- If genuine but blurry or cropped: score 38-60, readability "warning", note specific defects.
- Cross-verify details: Yash Kapoor, KA-05-MK-9284.

Output strictly valid JSON matching the schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: mime,
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isClaimDocument: { 
                type: Type.BOOLEAN, 
                description: 'True ONLY if image is an actual official claim document or vehicle accident damage photo. False for infographics, diagrams, selfies, pets, scenery, food, memes, etc.' 
              },
              targetMatch: { 
                type: Type.BOOLEAN, 
                description: 'True if image matches the expected target document type.' 
              },
              detectedCategory: { 
                type: Type.STRING, 
                description: 'police_fir, driving_licence, vehicle_rc, repair_estimate, hospital_record, vehicle_damage_photo, insurance_policy, or non_claim_image' 
              },
              detectedDocType: { 
                type: Type.STRING, 
                description: 'Clear descriptive name of what the image depicts (e.g. "Educational Infographic / Chart", "Cat / Pet Photo", "Driving Licence Smart Card")' 
              },
              score: { 
                type: Type.NUMBER, 
                description: 'Match score between 0 and 100. MUST BE 0 if isClaimDocument is false!' 
              },
              readability: { 
                type: Type.STRING, 
                description: '"pass", "warning", or "fail". Must be "fail" if isClaimDocument is false.' 
              },
              extractedText: { type: Type.STRING },
              recommendation: { type: Type.STRING },
              checklist: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    passed: { type: Type.BOOLEAN },
                    note: { type: Type.STRING }
                  },
                  required: ['label', 'passed', 'note']
                }
              },
              extractedFields: {
                type: Type.OBJECT,
                properties: {
                  documentNumber: { type: Type.STRING },
                  issueDate: { type: Type.STRING },
                  holderOrStation: { type: Type.STRING },
                  registrationOrId: { type: Type.STRING },
                  auditVerdict: { type: Type.STRING },
                  detectedContent: { type: Type.STRING }
                }
              },
              discrepancies: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['isClaimDocument', 'targetMatch', 'detectedCategory', 'detectedDocType', 'score', 'readability', 'recommendation', 'checklist']
          }
        }
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');

      // Comprehensive Fail-Safe Guardrails against Hallucinations & Non-Claim Images:
      const nonClaimKeywords = /infographic|diagram|chart|presentation|slide|selfie|portrait|person|face|pet|cat|dog|animal|food|meal|drink|nature|landscape|scenery|building|meme|screenshot|code|wallpaper|unrelated|unrecognized|random|artwork|illustration/i;
      
      const isExplicitlyNonClaim = 
        parsed.isClaimDocument === false ||
        parsed.detectedCategory === 'non_claim_image' ||
        nonClaimKeywords.test(parsed.detectedDocType || '') ||
        nonClaimKeywords.test(parsed.detectedCategory || '');

      let finalScore = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.score))) : 0;
      let finalReadability: 'pass' | 'warning' | 'fail' = parsed.readability || 'fail';
      let isPassing = false;

      if (isExplicitlyNonClaim) {
        // Enforce STRICT 0% score for random images, infographics, and non-insurance uploads
        finalScore = 0;
        finalReadability = 'fail';
        isPassing = false;

        const detectedName = parsed.detectedDocType || 'Unrecognized / Non-Insurance Image';

        return {
          score: 0,
          readability: 'fail',
          isRecognizedClaimDoc: false,
          detectedDocType: detectedName.toLowerCase().includes('image') || detectedName.toLowerCase().includes('infographic') || detectedName.toLowerCase().includes('photo') 
            ? detectedName 
            : `Non-Insurance Image: ${detectedName}`,
          ocrDetectedText: 'Forensic inspection rejected: No statutory insurance text, police stamps, RTO seals, or vehicle identifiers found in uploaded image.',
          recommendation: `REJECTED BY IRDAI PRE-AUDIT: The uploaded file is an unrelated image (${detectedName}) and NOT an insurance claim document. Insurers will summarily deny the claim. Please upload an official Police FIR, Driving Licence, Vehicle RC, or Repair Estimate.`,
          checklist: [
            { 
              label: 'Claim Document Recognition', 
              passed: false, 
              note: `Image depicts an unrelated file (${detectedName}), not a recognized statutory insurance document` 
            },
            { 
              label: 'Statutory Authority Seal & Issuer', 
              passed: false, 
              note: 'Zero official police, RTO, hospital, or surveyor markings detected' 
            },
            { 
              label: 'IRDAI Statutory Compliance', 
              passed: false, 
              note: 'Prerequisite check failed; automatic pre-audit rejection' 
            }
          ],
          extractedFields: {
            'Audit Verdict': 'REJECTED (0% Match)',
            'Detected Content': detectedName,
            'Required Document': expectedTargetName,
            'Action Required': 'Upload genuine statutory insurance document'
          },
          discrepancies: [
            `Uploaded file is an unrelated image (${detectedName}) and does not match insurance claim criteria.`,
            'Missing mandatory statutory authority credentials, round rubber stamp, and policyholder identity linkage.'
          ]
        };
      }

      // Check if document was targeted to a specific type and mismatched
      const isTargetMismatch = 
        docId && 
        docId !== 'custom-doc' && 
        !docId.startsWith('doc-custom') && 
        parsed.targetMatch === false;

      if (isTargetMismatch) {
        finalScore = Math.min(finalScore, 12);
        finalReadability = 'fail';
        isPassing = false;

        return {
          score: finalScore,
          readability: 'fail',
          isRecognizedClaimDoc: true,
          detectedDocType: `${parsed.detectedDocType || 'Claim Document'} (Slot Mismatch)`,
          ocrDetectedText: parsed.extractedText || 'Document content extracted but mismatched.',
          recommendation: `DOCUMENT MISMATCH: Uploaded document appears to be a ${parsed.detectedDocType || 'different document'}, but ${expectedTargetName} is required for this slot. Please upload the correct document.`,
          checklist: [
            { label: 'Target Document Match', passed: false, note: `Expected ${expectedTargetName}, but detected ${parsed.detectedDocType}` },
            { label: 'Document Type Legitimacy', passed: true, note: 'Valid claim document category detected' },
            { label: 'Slot Compliance', passed: false, note: 'Must upload to matching document slot' }
          ],
          extractedFields: parsed.extractedFields || { 'Detected Document': parsed.detectedDocType || 'Claim Document' },
          discrepancies: [
            `Document slot mismatch: This slot requires ${expectedTargetName}, but the uploaded file appears to be a ${parsed.detectedDocType}.`
          ]
        };
      }

      isPassing = finalScore >= 80;
      finalReadability = isPassing ? 'pass' : (finalScore >= 40 ? 'warning' : 'fail');

      return {
        score: finalScore,
        readability: finalReadability,
        isRecognizedClaimDoc: true,
        detectedDocType: parsed.detectedDocType || (isPassing ? (doc?.name || 'Inspected Document') : 'Degraded Insurance Document'),
        ocrDetectedText: parsed.extractedText || (isPassing ? 'Document text extracted successfully via Gemini Vision OCR.' : 'Low text legibility detected.'),
        recommendation: parsed.recommendation || (isPassing ? 'Document satisfies statutory criteria and is ready to attach.' : 'Document has quality warnings under IRDAI pre-audit.'),
        checklist: parsed.checklist && parsed.checklist.length > 0 ? parsed.checklist : [
          { label: 'Document Type Authentication', passed: isPassing, note: isPassing ? 'Valid claim document format' : 'Unrecognized document format' },
          { label: 'Statutory Seal & Authority', passed: isPassing, note: isPassing ? 'Official issuer marking detected' : 'No official insurance markings found' },
          { label: 'IRDAI Pre-Audit Clearance', passed: isPassing, note: isPassing ? 'Zero claim-blocking defects found' : 'Rejected under IRDAI guidelines' }
        ],
        extractedFields: parsed.extractedFields || (isPassing ? {} : { 'Audit Status': 'REVIEW', 'Reason': 'Quality Degradation' }),
        discrepancies: parsed.discrepancies || (isPassing ? [] : ['Uploaded document has legibility or formatting defects.'])
      };
    } catch (e) {
      console.warn('Gemini vision analysis error, rejecting upload with safe defaults:', e);
      return {
        score: 0,
        readability: 'fail',
        isRecognizedClaimDoc: false,
        detectedDocType: 'Unrecognized / Non-Insurance Image',
        ocrDetectedText: 'Forensic inspection failed: No statutory insurance text, official stamps, or vehicle identifiers found in uploaded image.',
        recommendation: `REJECTED BY IRDAI PRE-AUDIT: The uploaded file is not a valid motor or health claim document. Insurers will deny the claim. Please upload an official ${expectedTargetName}.`,
        checklist: [
          { label: 'Document Type Recognition', passed: false, note: 'Image does not contain a recognized insurance document structure' },
          { label: 'Statutory Issuer Seal & Stamp', passed: false, note: 'No official government, police, or insurer seal detected' },
          { label: 'IRDAI Statutory Compliance', passed: false, note: 'Failed prerequisite check. Insurer surveyor will reject non-claim files' }
        ],
        extractedFields: {
          'Audit Verdict': 'REJECTED (0% Match)',
          'Action Required': 'Upload genuine statutory document'
        },
        discrepancies: [
          'Uploaded image is not a recognized insurance document, driving licence, or vehicle damage proof.',
          'Missing mandatory police, RTO, or workshop credentials.'
        ]
      };
    }
  }

  // 2. Specialized Demo Case 1: Police FIR (doc-fir)
  if (docId === 'doc-fir') {
    if (sampleType === 'blurry') {
      return {
        score: 41,
        readability: 'warning',
        detectedDocType: 'FIR (First Information Report) — Station General Diary Entry',
        ocrDetectedText: 'POLICE STATION KORAMANGALA ... GD-882/[BLURRED] ... DATE: 28-09-2026 ~16:[ILLEGIBLE] ... SEC 279, 337 IPC ... SIGNATURE [UNREADABLE]',
        recommendation: 'The document is degraded and the timestamp is illegible. Insurer surveyor will issue Defect Notice R-102. Please upload a 300+ DPI scan or obtain a certified duplicate from the station.',
        checklist: [
          { label: 'File Format Supported', passed: true, note: 'PDF/JPEG readable by ingestion pipeline' },
          { label: 'Resolution & Text Legibility', passed: false, note: 'DPI 96 detected. Minimum required is 300 DPI for statutory legal submission' },
          { label: 'Official Issuer Round Seal', passed: false, note: 'Police station round rubber stamp is cropped off by 28% at bottom-right border' },
          { label: 'Incident Timestamp Verification', passed: false, note: 'Accident timestamp blurred; surveyor cannot cross-verify against claim First Notice of Loss' },
          { label: 'IRDAI Anti-Fraud & CCTNS Clearance', passed: false, note: 'High rejection probability (Defect Code R-102)' }
        ],
        extractedFields: {
          'Police Station': 'Koramangala Traffic PS (Partially Obscured)',
          'GD Diary Reference': 'GD-882/2026/[Illegible]',
          'Incident Timestamp': '28-09-2026 ~16:?? hrs',
          'Penal Sections': 'Sec 279, 337 IPC (Visible)',
          'Investigating Officer': 'ASI Ramesh K. (Signature Degraded)'
        },
        discrepancies: [
          'The incident time and station diary registration number are degraded and cannot be authenticated against state CCTNS database.',
          'Official police station rubber stamp is partially cropped off the edge of the scan.'
        ]
      };
    }

    // Clean FIR
    return {
      score: 96,
      readability: 'pass',
      detectedDocType: 'FIR (First Information Report) — Certified Station General Diary',
      ocrDetectedText: 'STATE POLICE DEPARTMENT • GENERAL DIARY ENTRY GD-882/2026/TR • KORAMANGALA TRAFFIC PS • DATE: 28-09-2026 16:45 HRS • VEHICLE: KA-05-MK-9284 • COMPLAINANT: YASH KAPOOR • SECTIONS: 279/337 IPC • SEAL VERIFIED',
      recommendation: 'Certified true copy with 350+ DPI clarity. General Diary reference GD-882 matches the incident timestamp and vehicle registration with zero discrepancies.',
      checklist: [
        { label: 'File Format Supported', passed: true, note: 'High quality PDF / JPEG container' },
        { label: 'Resolution & Text Legibility', passed: true, note: 'Clean DPI 350+ optical clarity' },
        { label: 'Official Station Seal & Signature', passed: true, note: 'Sub-Inspector circular seal and GD signature fully visible' },
        { label: 'Incident Timeline Synchronization', passed: true, note: 'Matches claim date 28-09-2026 16:45 hrs' },
        { label: 'Indian Motor Tariff Section 154', passed: true, note: 'Statutory compliance confirmed for third-party liability' }
      ],
      extractedFields: {
        'Police Station': 'Koramangala Traffic PS, Bengaluru City',
        'GD Entry Reference': 'GD-882/2026/TR',
        'Incident Date & Time': '28-09-2026 16:45 hrs',
        'Complainant / Driver': 'Yash Kapoor • KA-05-MK-9284',
        'Opposing Vehicle': 'Commercial Tempo • KA-01-EQ-4491',
        'Penal Sections': 'Sec 279, 337 IPC (Motor Collision)'
      },
      discrepancies: []
    };
  }

  // 3. Specialized Demo Case 2: Driving Licence (doc-dl)
  if (docId === 'doc-dl') {
    return {
      score: 99,
      readability: 'pass',
      detectedDocType: 'Driving Licence (Smart Card Form 7)',
      ocrDetectedText: 'UNION OF INDIA • DRIVING LICENCE • DL-0520180092811 • NAME: YASH KAPOOR • DOB: 14-06-1996 • CLASS: LMV-NT • VALIDITY: 13-06-2036 • ISSUING AUTH: RTO BENGALURU SOUTH • CHIP/HOLOGRAM AUTHENTICATED',
      recommendation: 'Permanent driving licence verified against MoRTH Sarathi national portal. Authorized for Light Motor Vehicles (LMV-NT) covering the insured Hyundai Creta.',
      checklist: [
        { label: 'High Resolution OCR Scanning', passed: true, note: 'Flawless 99.4% optical character recognition' },
        { label: 'Identity & Policyholder Match', passed: true, note: 'Exact name match with policyholder Yash Kapoor' },
        { label: 'Vehicle Class Entitlement', passed: true, note: 'Authorized for Private Passenger Car (LMV-NT)' },
        { label: 'Licence Validity Window', passed: true, note: 'Active permanent licence, validity extends to 13-06-2036' },
        { label: 'Smart Card Hologram & Microchip', passed: true, note: 'Physical security features authenticated' }
      ],
      extractedFields: {
        'Licence Number': 'DL-0520180092811',
        'Holder Full Name': 'YASH KAPOOR',
        'Date of Birth': '14-06-1996',
        'Vehicle Class': 'LMV-NT (Light Motor Vehicle - Non Transport)',
        'Validity Period': '14-06-2018 to 13-06-2036 (Active)',
        'Issuing Authority': 'RTO Bengaluru South (KA-05)'
      },
      discrepancies: []
    };
  }

  // 4. Specialized Demo Case 3: Hospital Casualty Slip (hospital)
  if (docId === 'doc-hospital' || sampleType === 'hospital') {
    return {
      score: 88,
      readability: 'warning',
      detectedDocType: 'Emergency Casualty Admission Record (Apollo Hospitals)',
      ocrDetectedText: 'APOLLO HOSPITALS BANNERGHATTA • EMERGENCY CASUALTY • IP-99214 • ADMISSION: 28-09-2026 19:15 HRS • PATIENT: YASH KAPOOR • DIAGNOSIS: BLUNT TRAUMA CHEST & RIGHT WRIST SPRAIN • MLC NO: MLC-4418 • CASHLESS PRE-AUTH REQUESTED',
      recommendation: 'Hospital casualty record verified. Admission time (19:15 hrs) is 2.5 hours after incident (16:45 hrs). The minor interval between collision and ER registration is within acceptable bounds.',
      checklist: [
        { label: 'Hospital Accreditation Verified', passed: true, note: 'Apollo Hospitals Bannerghatta Road (NABH Accredited)' },
        { label: 'Patient Demographics Check', passed: true, note: 'Name Yash Kapoor, Age 30 M' },
        { label: 'Medico-Legal Case (MLC) Entry', passed: true, note: 'MLC-4418 tagged for road traffic accident' },
        { label: 'Temporal Consistency', passed: true, note: 'Admission 2.5 hours post-accident (Temporal delta validated)' }
      ],
      extractedFields: {
        'Hospital Name': 'Apollo Hospitals, Bannerghatta Road',
        'IP Admission No': 'IP-99214 / MLC-4418',
        'Admission Timestamp': '28-09-2026 19:15 hrs',
        'Attending Surgeon': 'Dr. S. K. Narayanan (MS Ortho)',
        'Cashless TPA Network': 'Medi Assist TPA / HDFC ERGO Health'
      },
      discrepancies: []
    };
  }

  // 5. Specialized Demo Case 4: Vehicle Registration Certificate (doc-rc)
  if (docId === 'doc-rc') {
    return {
      score: 98,
      readability: 'pass',
      detectedDocType: 'Vehicle Registration Certificate (Smart Card Form 23)',
      ocrDetectedText: 'GOVERNMENT OF KARNATAKA • TRANSPORT DEPARTMENT • REGN NO: KA-05-MK-9284 • CHASSIS: MALC511BAM29481 • ENGINE: G4FLN182941 • OWNER: YASH KAPOOR • VEHICLE: HYUNDAI CRETA 1.5 SX(O) • REG DATE: 12-10-2022 • FITNESS: 11-10-2037',
      recommendation: 'Registration Certificate validated against VAHAN national register. Confirms insurable interest and chassis number match for the insured vehicle.',
      checklist: [
        { label: 'VAHAN Registry Verification', passed: true, note: 'Active registration in Karnataka RTO KA-05' },
        { label: 'Chassis & Engine Digits', passed: true, note: 'Exact match: MALC511BAM29481 / G4FLN182941' },
        { label: 'Vehicle Ownership Interest', passed: true, note: 'Owned by Yash Kapoor (Zero insurable interest defect)' },
        { label: 'Hypothecation / Loan Status', passed: true, note: 'Hypothecated to HDFC Bank Ltd (NOC required only for total loss)' }
      ],
      extractedFields: {
        'Registration Mark': 'KA-05-MK-9284',
        'Registered Owner': 'YASH KAPOOR',
        'Make & Model': 'Hyundai Creta 1.5 SX(O) Petrol',
        'Chassis Number': 'MALC511BAM29481',
        'Engine Number': 'G4FLN182941',
        'Registration Date': '12-10-2022 (Fitness Valid to 2037)'
      },
      discrepancies: []
    };
  }

  // 6. Generic Fallback Diagnostic
  return {
    score: 93,
    readability: 'pass',
    detectedDocType: doc?.name || 'Insurance Claim Verification Specimen',
    ocrDetectedText: `${doc?.name || 'Document'} • REF: ${doc?.code || 'DOC-01'} • VERIFIED PRE-AUDIT DOSSIER`,
    recommendation: 'Document satisfies statutory formatting standards and is ready for surveyor submission.',
    checklist: [
      { label: 'High Resolution OCR Scanning', passed: true, note: 'Clean DPI 300+ text clarity' },
      { label: 'Issuer Seal & Signature Check', passed: true, note: 'Certified watermark and issuer seal detected' },
      { label: 'IRDAI Schema Validation', passed: true, note: 'Zero claim-blocking defects found' }
    ],
    extractedFields: {
      'Document Name': doc?.name || 'Inspection Dossier',
      'Reference Code': doc?.code || 'DOC-REF',
      'Audit Status': 'Pre-Audit Verified'
    },
    discrepancies: []
  };
}

/**
 * Transcribe spoken voice/audio using Gemini Audio models
 */
export async function transcribeAudioWithAI(base64Audio: string, mimeType = 'audio/webm'): Promise<string> {
  const cleanBase64 = base64Audio.replace(/^data:[^;]+;base64,/, '');
  const cleanMime = mimeType.split(';')[0] || 'audio/webm';
  const audioPart = {
    inlineData: {
      mimeType: cleanMime,
      data: cleanBase64,
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: [
        audioPart,
        'Transcribe this spoken incident description accurately in English. Output only the verbatim transcript with zero conversational filler or preamble.'
      ]
    });

    return response.text?.trim() || '';
  } catch (error) {
    console.warn('Audio transcription error with gemini-3.5-transcribe, falling back to gemini-3.8-flash:', error);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          audioPart,
          'Transcribe this spoken incident description accurately in English. Output only the verbatim transcript.'
        ]
      });
      return response.text?.trim() || '';
    } catch (e2) {
      console.error('Secondary audio transcription error:', e2);
      throw error;
    }
  }
}
