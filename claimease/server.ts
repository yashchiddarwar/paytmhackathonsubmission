import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { dbInstance } from './server/db';
import {
  generateClaimChatResponse,
  convertIncidentToClaimJourney,
  diagnoseDocumentWithAI,
  transcribeAudioWithAI
} from './server/ai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '25mb' }));

// -----------------------------------------------------------------------------
// REST API ROUTES
// -----------------------------------------------------------------------------

// Database Status & Diagnostics
app.get('/api/db/status', (req, res) => {
  const data = dbInstance.getData();
  res.json({
    status: 'connected',
    type: 'persistent_json_store',
    totalClaims: data.claims.length,
    totalDocuments: data.documents.length,
    totalPolicies: data.policies.length,
    activeClaimId: data.claims[0]?.claimNumber,
    lastUpdated: data.claims[0]?.updatedAt
  });
});

app.post('/api/db/reset', (req, res) => {
  const refreshed = dbInstance.resetToSeed();
  res.json({ success: true, message: 'Database reset to canonical sample state.', data: refreshed });
});

// Documents API (Stored in Database)
app.get('/api/documents', (req, res) => {
  const documents = dbInstance.getDocuments();
  res.json(documents);
});

app.get('/api/documents/:id', (req, res) => {
  const doc = dbInstance.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(doc);
});

app.post('/api/documents', (req, res) => {
  const newDoc = dbInstance.addDocument(req.body);
  res.status(201).json(newDoc);
});

app.put('/api/documents/:id', (req, res) => {
  const updated = dbInstance.updateDocument(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(updated);
});

// Claims API
app.get('/api/claims', (req, res) => {
  const claims = dbInstance.getClaims();
  res.json(claims);
});

app.get('/api/claims/active', (req, res) => {
  const active = dbInstance.getActiveClaim();
  // Return null with 200 OK for clean brand-new account state without 404 console errors
  res.json(active || null);
});

app.post('/api/claims/clear', (req, res) => {
  const data = dbInstance.clearAllClaims();
  res.json({ success: true, message: 'All claims cleared. Account is now brand new.', data });
});

app.delete('/api/claims', (req, res) => {
  const data = dbInstance.clearAllClaims();
  res.json({ success: true, message: 'All claims cleared.', data });
});

app.post('/api/claims/seed-sample', (req, res) => {
  const sampleClaim = dbInstance.seedSampleClaim();
  res.json({ success: true, message: 'Sample claim seeded for testing.', claim: sampleClaim });
});

app.get('/api/claims/:id', (req, res) => {
  const claim = dbInstance.getClaimById(req.params.id);
  if (!claim) {
    return res.status(404).json({ error: 'Claim not found' });
  }
  res.json(claim);
});

app.post('/api/claims', (req, res) => {
  const created = dbInstance.createClaim(req.body);
  res.status(201).json(created);
});

app.put('/api/claims/:id', (req, res) => {
  const updated = dbInstance.updateClaim(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Claim not found' });
  }
  res.json(updated);
});

// Policies API
app.get('/api/policies', (req, res) => {
  const policies = dbInstance.getPolicies();
  res.json(policies);
});

// AI Copilot Endpoints
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, claimId, currentStep, chatHistory } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const aiResult = await generateClaimChatResponse({
      message,
      claimId,
      currentStep,
      chatHistory
    });

    res.json(aiResult);
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    res.status(500).json({ error: error.message || 'AI generation failed' });
  }
});

app.post('/api/ai/convert-incident', async (req, res) => {
  try {
    const { narrative } = req.body;
    if (!narrative || typeof narrative !== 'string') {
      return res.status(400).json({ error: 'Incident narrative text or speech transcript is required' });
    }

    const conversionResult = await convertIncidentToClaimJourney(narrative);
    res.json(conversionResult);
  } catch (error: any) {
    console.error('Error in /api/ai/convert-incident:', error);
    res.status(500).json({ error: error.message || 'Incident conversion failed' });
  }
});

app.post('/api/ai/diagnose-document', async (req, res) => {
  try {
    const { docId, imageBase64, sampleType, attachToClaim, expectedDocType } = req.body;
    if (!docId) {
      return res.status(400).json({ error: 'docId is required' });
    }

    const diagnostic = await diagnoseDocumentWithAI(docId, imageBase64, sampleType, expectedDocType);
    const isPassing = diagnostic.score >= 80;
    const isRejected = diagnostic.score === 0 || diagnostic.isRecognizedClaimDoc === false;

    const docUpdates: any = {
      diagnosticScore: diagnostic.score,
      readiness: isPassing ? '100% Ready' : (isRejected ? '0% Rejected' : `${diagnostic.score}% Read`),
      ocrConfidence: diagnostic.score,
      status: isPassing ? 'verified' : (isRejected ? 'warning' : 'warning'),
      verified: isPassing,
      notes: isPassing 
        ? `Verified by Gemini Vision AI (${diagnostic.score}% confidence)` 
        : (isRejected
          ? `IRDAI Pre-Audit REJECTED: ${diagnostic.discrepancies?.[0] || 'Non-insurance image detected'}`
          : `Defect flagged: ${diagnostic.discrepancies?.[0] || 'Quality warning (IRDAI Code R-102)'}`)
    };

    if (sampleType === 'clean' && docId === 'doc-fir') {
      docUpdates.fileName = 'station_diary_gd882_certified.pdf';
      docUpdates.fileSize = '2.4 MB';
      docUpdates.discrepancyAlert = undefined;
    } else if (sampleType === 'blurry' && docId === 'doc-fir') {
      docUpdates.fileName = 'fir_scan_degraded.jpg';
      docUpdates.fileSize = '1.1 MB';
      docUpdates.discrepancyAlert = 'Stamp cropped and timestamp blurred (IRDAI Defect R-102)';
    } else if (docId === 'doc-dl') {
      docUpdates.fileName = 'driving_licence_smartcard.png';
      docUpdates.fileSize = '1.8 MB';
      docUpdates.discrepancyAlert = undefined;
    } else if (docId === 'doc-rc') {
      docUpdates.fileName = 'rc_smartcard_form23.png';
      docUpdates.fileSize = '2.2 MB';
      docUpdates.discrepancyAlert = undefined;
    }

    let updatedDoc = dbInstance.updateDocument(docId, docUpdates);

    // If it's a custom uploaded document, add or register it
    if (!updatedDoc && (docId === 'custom-doc' || docId.startsWith('doc-custom'))) {
      const customDocObj: any = {
        id: docId === 'custom-doc' ? `doc-custom-${Date.now()}` : docId,
        name: diagnostic.detectedDocType || 'Custom Inspected Document',
        code: 'DOC-CUSTOM',
        category: 'Motor',
        required: true,
        status: isPassing ? 'verified' : 'warning',
        fileSize: '1.9 MB',
        fileName: 'uploaded_specimen.pdf',
        ocrConfidence: diagnostic.score,
        diagnosticScore: diagnostic.score,
        verified: isPassing,
        readiness: isPassing ? '100% Ready' : (isRejected ? '0% Rejected' : `${diagnostic.score}% Read`),
        description: isRejected ? 'Unrelated image rejected by IRDAI Pre-Audit' : 'User uploaded specimen audited by Gemini Vision AI',
        mandateReason: 'Forensic supporting evidence',
        notes: isPassing 
          ? 'Passed optical and statutory check' 
          : (isRejected ? 'Rejected: Non-insurance image' : 'Manual surveyor review recommended')
      };
      updatedDoc = dbInstance.addDocument(customDocObj);
    }

    // If attachToClaim requested, ensure active claim exists and attach document
    let activeClaim: any = dbInstance.getActiveClaim();
    if (attachToClaim && isPassing) {
      if (!activeClaim) {
        activeClaim = dbInstance.seedSampleClaim();
      }
      activeClaim = dbInstance.updateClaim(activeClaim.id, {
        progressPercent: Math.min(100, Math.max(activeClaim.progressPercent || 50, 75) + 10),
        status: 'in_review'
      });
    }

    res.json({
      ...diagnostic,
      updatedDocument: updatedDoc,
      activeClaim: dbInstance.getActiveClaim()
    });
  } catch (error: any) {
    console.error('Error in /api/ai/diagnose-document:', error);
    res.status(500).json({ error: error.message || 'Diagnostic failed' });
  }
});

app.post('/api/documents/:id/attach', (req, res) => {
  try {
    const { id } = req.params;
    const { sampleType, score } = req.body;
    let activeClaim = dbInstance.getActiveClaim();
    if (!activeClaim) {
      activeClaim = dbInstance.seedSampleClaim();
    }

    const updatedDoc = dbInstance.updateDocument(id, {
      status: 'verified',
      verified: true,
      diagnosticScore: score || 96,
      ocrConfidence: score || 96,
      readiness: '100% Ready',
      discrepancyAlert: undefined,
      notes: 'Verified by Gemini Vision AI and attached to claim dossier'
    });

    const updatedClaim = dbInstance.updateClaim(activeClaim.id, {
      progressPercent: Math.min(100, Math.max(activeClaim.progressPercent || 50, 75) + 10)
    });

    res.json({ success: true, document: updatedDoc, claim: updatedClaim });
  } catch (err: any) {
    console.error('Error attaching document:', err);
    res.status(500).json({ error: err.message || 'Failed to attach document' });
  }
});

app.post('/api/documents/reset-demo', (req, res) => {
  try {
    // Reset FIR to blurry degraded state, keep DL clean for instant testing
    dbInstance.updateDocument('doc-fir', {
      status: 'warning',
      verified: false,
      diagnosticScore: 41,
      ocrConfidence: 41,
      readiness: '41% Read',
      fileName: 'fir_scan_degraded.jpg',
      fileSize: '1.1 MB',
      discrepancyAlert: 'Stamp cropped and timestamp blurred (IRDAI Defect R-102)',
      notes: 'Defect notice R-102: Text resolution below 300 DPI'
    });
    dbInstance.updateDocument('doc-dl', {
      status: 'verified',
      verified: true,
      diagnosticScore: 99,
      ocrConfidence: 99,
      readiness: '100% Ready',
      fileName: 'driving_licence_smartcard.png',
      fileSize: '1.8 MB',
      discrepancyAlert: undefined,
      notes: 'Verified against Sarathi portal'
    });

    // Clean up temporary custom uploaded test documents
    const data = (dbInstance as any).getData();
    data.documents = data.documents.filter((d: any) => !d.id.startsWith('doc-custom'));
    for (const claim of data.claims) {
      if (claim.documents) {
        claim.documents = claim.documents.filter((d: any) => !d.id.startsWith('doc-custom'));
      }
    }
    (dbInstance as any).persist();

    res.json({ success: true, documents: dbInstance.getDocuments(), activeClaim: dbInstance.getActiveClaim() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }
    const text = await transcribeAudioWithAI(audioBase64, mimeType);
    res.json({ text });
  } catch (error: any) {
    console.error('Error in /api/ai/transcribe-audio:', error);
    res.status(500).json({ error: error.message || 'Audio transcription failed' });
  }
});

// -----------------------------------------------------------------------------
// VITE SETUP (Development Middleware vs Production Static)
// -----------------------------------------------------------------------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development: mount Vite dev server as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve built static files
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClaimEase full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
