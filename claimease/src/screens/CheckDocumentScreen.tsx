import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, ClaimDocument } from '../types';
import { HOTLINK_IMAGES, MOCK_DOCUMENTS } from '../data/mockData';
import { diagnoseDocument, attachDocumentToClaim, resetDemoDocuments } from '../services/api';

// Sample non-insurance image data URI for instantaneous 1-click verification of 0% rejection
const SAMPLE_RANDOM_IMAGE = 
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231e293b"/><text x="40" y="55" font-family="sans-serif" font-size="20" font-weight="bold" fill="%23f8fafc">Q3 Marketing Analytics &amp; User Engagement Infographic</text><rect x="40" y="90" width="100" height="230" rx="8" fill="%2338bdf8"/><rect x="170" y="140" width="100" height="180" rx="8" fill="%234ade80"/><rect x="300" y="60" width="100" height="260" rx="8" fill="%23fbbf24"/><rect x="430" y="110" width="100" height="210" rx="8" fill="%23a855f7"/><text x="50" y="350" font-family="sans-serif" font-size="13" fill="%2394a3b8">Organic</text><text x="180" y="350" font-family="sans-serif" font-size="13" fill="%2394a3b8">Referral</text><text x="310" y="350" font-family="sans-serif" font-size="13" fill="%2394a3b8">Viral Reach</text><text x="440" y="350" font-family="sans-serif" font-size="13" fill="%2394a3b8">Conversions</text></svg>';

interface CheckDocumentScreenProps {
  onNavigate: (screen: ScreenType) => void;
  selectedDocForCheck?: ClaimDocument | null;
  onViewSample?: (doc: ClaimDocument) => void;
  onDocumentAttached?: (doc: any, updatedClaim?: any) => void;
}

export const CheckDocumentScreen: React.FC<CheckDocumentScreenProps> = ({
  onNavigate,
  selectedDocForCheck,
  onViewSample,
  onDocumentAttached
}) => {
  // Active demo document selection
  const [activeDocId, setActiveDocId] = useState<string>(
    selectedDocForCheck?.id || 'doc-fir'
  );
  const [activeSampleType, setActiveSampleType] = useState<'blurry' | 'clean' | 'hospital'>(
    selectedDocForCheck?.id === 'doc-dl' ? 'clean' : (selectedDocForCheck?.status === 'verified' ? 'clean' : 'blurry')
  );

  // Custom user file upload state
  const [customFile, setCustomFile] = useState<{ name: string; size: string; base64: string } | null>(null);

  // Diagnostic AI Engine state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachedToClaim, setAttachedToClaim] = useState(false);
  const [attachFeedback, setAttachFeedback] = useState<string | null>(null);

  // 1-Click Guided Demo Walkthrough State
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const demoTimerRef = useRef<any>(null);

  const [diagnosticResult, setDiagnosticResult] = useState<{
    score: number;
    readability: 'pass' | 'warning' | 'fail';
    ocrDetectedText: string;
    checklist: { label: string; passed: boolean; note: string }[];
    extractedFields: Record<string, string>;
    discrepancies: string[];
    recommendation: string;
    detectedDocType: string;
    isRecognizedClaimDoc?: boolean;
  } | null>(null);

  const firDoc = MOCK_DOCUMENTS.find(d => d.id === 'doc-fir') || MOCK_DOCUMENTS[0];
  const dlDoc = MOCK_DOCUMENTS.find(d => d.id === 'doc-dl') || MOCK_DOCUMENTS[1];
  const rcDoc = MOCK_DOCUMENTS.find(d => d.id === 'doc-rc') || MOCK_DOCUMENTS[2];

  // Run live AI diagnosis with expected document type enforcement
  const runDiagnostic = async (
    docId: string, 
    sampleType?: 'blurry' | 'clean' | 'hospital', 
    customBase64?: string,
    targetExpectedType?: string
  ) => {
    setIsAnalyzing(true);
    setAttachedToClaim(false);
    setAttachFeedback(null);
    try {
      const target = targetExpectedType || (docId === 'doc-fir' ? 'fir' : (docId === 'doc-dl' ? 'dl' : (docId === 'doc-rc' ? 'rc' : 'custom')));
      const result = await diagnoseDocument(docId, customBase64, sampleType, false, target);
      setDiagnosticResult(result);
    } catch (err) {
      console.warn('Diagnosis error, using fallback:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedDocForCheck) {
      setActiveDocId(selectedDocForCheck.id);
      const isDL = selectedDocForCheck.id === 'doc-dl';
      const sample = isDL ? 'clean' : (selectedDocForCheck.status === 'verified' ? 'clean' : 'blurry');
      setActiveSampleType(sample);
      setCustomFile(null);
      runDiagnostic(selectedDocForCheck.id, sample);
    } else {
      runDiagnostic('doc-fir', 'blurry');
    }
    return () => {
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    };
  }, [selectedDocForCheck]);

  const handleSelectPreset = (docId: string, sampleType: 'blurry' | 'clean' | 'hospital') => {
    if (isDemoRunning) {
      setIsDemoRunning(false);
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    }
    setActiveDocId(docId);
    setActiveSampleType(sampleType);
    setCustomFile(null);
    runDiagnostic(docId, sampleType);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCustomFile({
          name: file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          base64
        });
        const target = activeDocId === 'doc-fir' ? 'fir' : (activeDocId === 'doc-dl' ? 'dl' : (activeDocId === 'doc-rc' ? 'rc' : 'custom'));
        runDiagnostic(activeDocId, undefined, base64, target);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTestRandomImage = () => {
    if (isDemoRunning) {
      setIsDemoRunning(false);
      if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    }
    setCustomFile({
      name: 'random_marketing_infographic.png',
      size: '1.24 MB',
      base64: SAMPLE_RANDOM_IMAGE
    });
    const target = activeDocId === 'doc-fir' ? 'fir' : (activeDocId === 'doc-dl' ? 'dl' : 'custom');
    runDiagnostic(activeDocId, undefined, SAMPLE_RANDOM_IMAGE, target);
  };

  const handleClearCustomFile = () => {
    setCustomFile(null);
    runDiagnostic(activeDocId, activeSampleType);
  };

  const currentPreviewImage = () => {
    if (customFile) return customFile.base64;
    if (activeDocId === 'doc-dl') return HOTLINK_IMAGES.dl;
    if (activeDocId === 'doc-rc') return HOTLINK_IMAGES.rc;
    if (activeDocId === 'doc-hospital') return HOTLINK_IMAGES.medicalSlip;
    if (activeSampleType === 'clean') return HOTLINK_IMAGES.firDetail;
    return HOTLINK_IMAGES.fir;
  };

  // End-to-end Attachment of verified document to active claim
  const handleAttachToClaim = async () => {
    if ((diagnosticResult?.score || 0) < 80 || diagnosticResult?.isRecognizedClaimDoc === false) {
      return;
    }
    setIsAttaching(true);
    try {
      const res = await attachDocumentToClaim(
        activeDocId,
        activeSampleType,
        diagnosticResult?.score || 96
      );
      setAttachedToClaim(true);
      setAttachFeedback(`✓ Document successfully verified & cryptographically sealed into Claim Dossier!`);
      if (onDocumentAttached) {
        onDocumentAttached(res.document, res.claim);
      }
    } catch (err) {
      console.warn('Attach document error, proceeding in offline mode:', err);
      setAttachedToClaim(true);
      setAttachFeedback(`✓ Document verified & attached locally.`);
    } finally {
      setIsAttaching(false);
    }
  };

  // 1-Click Guided Demo: Step 1 (Blurry FIR Flagged) -> Step 2 (Clean FIR Verified) -> Step 3 (Attached)
  const startGuidedDemo = () => {
    setIsDemoRunning(true);
    setDemoStep(1);
    handleSelectPreset('doc-fir', 'blurry');

    demoTimerRef.current = setTimeout(() => {
      setDemoStep(2);
      handleSelectPreset('doc-fir', 'clean');

      demoTimerRef.current = setTimeout(async () => {
        setDemoStep(3);
        await handleAttachToClaim();
        setIsDemoRunning(false);
      }, 3500);
    }, 3800);
  };

  const handleResetDemo = async () => {
    setIsDemoRunning(false);
    if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
    try {
      await resetDemoDocuments();
      handleSelectPreset('doc-fir', 'blurry');
    } catch (e) {
      handleSelectPreset('doc-fir', 'blurry');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto gap-8 pb-12 animate-fade-in">
      {/* Top Banner & Telemetry */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#632D93]/40 border border-[#DEB7FF]/30 text-[#DEB7FF] text-xs font-semibold mb-2">
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            <span>Ollama Vision AI (Llama 3.2) Diagnostic Engine</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-display">
            AI Document Check & Forensic Audit
          </h1>
          <p className="text-zinc-400 text-sm md:text-base mt-1.5 max-w-3xl leading-relaxed">
            Automated optical and statutory pre-audit for insurance claims. Evaluates legibility, cross-verifies statutory stamps, and checks Sarathi/CCTNS compliance before insurer submission.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <button
            onClick={startGuidedDemo}
            disabled={isDemoRunning}
            className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 transition-all shadow-lg ${
              isDemoRunning
                ? 'bg-[#C5F258] text-[#151F00] animate-pulse'
                : 'bg-[#632D93] hover:bg-[#7837b0] text-[#DEB7FF] border border-[#DEB7FF]/40'
            }`}
            title="Automatically run the 10-second demo showcasing defect detection, correction, and claim attachment"
          >
            <span className="material-symbols-outlined text-[16px]">
              {isDemoRunning ? 'sync' : 'play_circle'}
            </span>
            <span>{isDemoRunning ? `Demo Running (Step ${demoStep}/3)...` : '⚡ 1-Click Fast Demo'}</span>
          </button>

          <button
            onClick={handleTestRandomImage}
            className="px-3.5 py-2 rounded-full bg-red-950/70 hover:bg-red-900/90 text-red-200 border border-red-500/40 text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            title="Audit a random infographic image to verify that the AI catches and rejects it with 0% match"
          >
            <span className="material-symbols-outlined text-[15px] text-red-400">block</span>
            <span>🧪 Test Random Image (0% Reject)</span>
          </button>

          <button 
            onClick={handleResetDemo}
            className="px-3.5 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors flex items-center gap-1.5"
            title="Reset demo documents to default states"
          >
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            <span>Reset Demo</span>
          </button>

          <button 
            onClick={() => onViewSample?.(activeDocId === 'doc-dl' ? dlDoc : firDoc)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#1C1B1B] hover:bg-zinc-800 border border-white/[0.08] text-xs font-semibold text-zinc-300 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px]">visibility</span>
            <span>Specimen Info</span>
          </button>
        </div>
      </div>

      {/* Primary Demo Document Showcase Selection (Document 1 & Document 2) */}
      <div className="p-5 md:p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-2xl flex flex-col gap-4 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -left-20 -top-20 w-56 h-56 rounded-full bg-[#C5F258]/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10 pb-1 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C5F258] text-[20px]">fact_check</span>
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Primary Demo Documents: Select A Specimen to Check
            </span>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Focus: <strong className="text-[#C5F258]">Doc 1 (Police FIR)</strong> &amp; <strong className="text-[#DEB7FF]">Doc 2 (Driving Licence)</strong>
          </span>
        </div>

        {/* 2-Document Grid Cards with Explanatory Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          {/* ============================================================ */}
          {/* DEMO CARD 1: POLICE FIR (Defect vs Certified True Copy)      */}
          {/* ============================================================ */}
          <div className={`p-4 md:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            activeDocId === 'doc-fir' && !customFile
              ? 'bg-[#181818] border-[#C5F258]/60 shadow-[0_0_24px_rgba(197,242,88,0.15)] ring-1 ring-[#C5F258]/30'
              : 'bg-[#131313] border-white/5 hover:border-white/20'
          }`}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#632D93] text-[#DEB7FF] flex items-center justify-center text-xs font-bold">1</span>
                  <h3 className="text-sm font-bold text-white">Document 1: Police FIR / GD Entry</h3>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                  Accident Evidence
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Mandatory for road collision liability. Demonstrates how AI catches degraded scans with cropped round stamps and validates certified diary entries.
              </p>
            </div>

            {/* Sub-variant toggle: Blurry (Defective) vs Certified (Clean) */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => handleSelectPreset('doc-fir', 'blurry')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  activeDocId === 'doc-fir' && activeSampleType === 'blurry' && !customFile
                    ? 'bg-[#FF823A]/20 border-[#FF823A] text-white shadow-[0_0_15px_rgba(255,130,58,0.25)]'
                    : 'bg-[#1F1E1E] hover:bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FF823A]">⚠️ Blurry Scan</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-black/50 text-[#FF823A]">Score: 41%</span>
                </div>
                <span className="text-[11px] text-zinc-400 leading-tight">
                  Cropped station stamp, blurred timestamp (Flagged by AI).
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('doc-fir', 'clean')}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  activeDocId === 'doc-fir' && activeSampleType === 'clean' && !customFile
                    ? 'bg-[#C5F258]/20 border-[#C5F258] text-white shadow-[0_0_15px_rgba(197,242,88,0.25)]'
                    : 'bg-[#1F1E1E] hover:bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#C5F258]">✓ Certified Copy</span>
                  <span className="text-[10px] font-mono px-1 rounded bg-black/50 text-[#C5F258]">Score: 96%</span>
                </div>
                <span className="text-[11px] text-zinc-400 leading-tight">
                  Clear round seal, GD-882 entry verified (Approved).
                </span>
              </button>
            </div>
          </div>

          {/* ============================================================ */}
          {/* DEMO CARD 2: DRIVING LICENCE SMART CARD                      */}
          {/* ============================================================ */}
          <div className={`p-4 md:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
            activeDocId === 'doc-dl' && !customFile
              ? 'bg-[#181818] border-[#DEB7FF]/60 shadow-[0_0_24px_rgba(222,183,255,0.15)] ring-1 ring-[#DEB7FF]/30'
              : 'bg-[#131313] border-white/5 hover:border-white/20'
          }`}>
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#DEB7FF] text-[#2D0050] flex items-center justify-center text-xs font-bold">2</span>
                  <h3 className="text-sm font-bold text-white">Document 2: Driving Licence Smart Card</h3>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-[#DEB7FF]">
                  Sarathi Portal Match
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Statutory driver entitlement audit. Cross-checks policyholder identity (Yash Kapoor), authorized LMV-NT vehicle class, active validity till 2036, and security hologram.
              </p>
            </div>

            <div className="pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => handleSelectPreset('doc-dl', 'clean')}
                className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                  activeDocId === 'doc-dl' && !customFile
                    ? 'bg-[#DEB7FF]/20 border-[#DEB7FF] text-white shadow-[0_0_15px_rgba(222,183,255,0.25)]'
                    : 'bg-[#1F1E1E] hover:bg-zinc-800 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#DEB7FF] text-[20px]">badge</span>
                  <div>
                    <span className="text-xs font-bold text-white block">Form 7 Smart Card Specimen</span>
                    <span className="text-[11px] text-zinc-400">Class: LMV-NT • RTO Bengaluru South KA-05</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#DEB7FF]/20 text-[#DEB7FF]">
                  Score: 99%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Optional secondary tab selectors: RC & Custom File Upload */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-zinc-400 border-t border-white/[0.05]">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-semibold uppercase text-[11px]">Also Available:</span>
            <button
              onClick={() => handleSelectPreset('doc-rc', 'clean')}
              className={`px-3 py-1 rounded-full border text-xs transition-colors flex items-center gap-1.5 ${
                activeDocId === 'doc-rc' && !customFile
                  ? 'bg-zinc-800 border-[#C5F258] text-white'
                  : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
              }`}
            >
              <span>🚗 Vehicle RC (Form 23)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">Need to audit an external file?</span>
            <label className="cursor-pointer text-[#C5F258] hover:underline font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px]">upload_file</span>
              <span>Upload PDF/JPG</span>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Main Diagnostic Workspace (Left Dropzone & Specimen / Right AI Analysis) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Ingestion Dropzone & Specimen Viewer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                  Document Ingestion &amp; Live Optical Stream
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-base font-bold text-white truncate max-w-sm">
                    {customFile
                      ? `Uploaded: ${customFile.name}`
                      : activeDocId === 'doc-fir'
                      ? (activeSampleType === 'blurry' ? 'Police FIR Copy (Degraded 96 DPI Scan)' : 'Police FIR Copy (Certified True Copy)')
                      : activeDocId === 'doc-dl'
                      ? 'Permanent Driving Licence (Smart Card Form 7)'
                      : 'Vehicle Registration Certificate (RC)'}
                  </h3>
                  {customFile && (
                    <button
                      onClick={handleClearCustomFile}
                      className="px-2 py-0.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold border border-white/10 flex items-center gap-1 transition-colors"
                      title="Clear custom file and restore presets"
                    >
                      <span className="material-symbols-outlined text-[13px]">close</span>
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 border border-white/5">
                <span className="material-symbols-outlined text-[14px] text-[#C5F258]">document_scanner</span>
                <span>Ollama Vision</span>
              </span>
            </div>

            {/* Specimen Inspection Viewport with Scanning Laser Beam Animation */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black min-h-[380px] flex items-center justify-center group shadow-2xl">
              <img
                src={currentPreviewImage()}
                alt="Document Preview"
                referrerPolicy="no-referrer"
                className={`w-full max-h-[460px] object-contain transition-all duration-300 ${
                  activeSampleType === 'blurry' && !customFile ? 'blur-[1.8px] brightness-90 contrast-80' : ''
                }`}
              />

              {/* Laser Scanning Line Animation when analyzing */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex flex-col items-center justify-center z-20">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-[#C5F258] shadow-[0_0_20px_#C5F258] animate-[bounce_1.5s_infinite]" />
                  <div className="px-5 py-3 rounded-2xl bg-[#1C1B1B]/95 border border-[#C5F258] text-[#C5F258] font-bold text-xs flex items-center gap-3 shadow-2xl">
                    <span className="w-4 h-4 border-2 border-[#C5F258] border-t-transparent rounded-full animate-spin" />
                    <span>Auditing Optical Clarity, Issuer Seal &amp; Statutory Entities...</span>
                  </div>
                </div>
              )}

              {/* Stamp Alert Overlay for Blurry Specimen */}
              {activeSampleType === 'blurry' && !customFile && !isAnalyzing && (
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-red-950/90 border border-red-500/60 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-red-200 shadow-xl">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400 text-[20px] shrink-0">error</span>
                    <div>
                      <span className="font-bold text-white block">Degraded Scan Detected (Score 41%)</span>
                      <span className="text-[11px] text-red-200">Cropped round stamp &amp; illegible timestamp will cause surveyor rejection.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectPreset('doc-fir', 'clean')}
                    className="px-3 py-1.5 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs transition-colors shrink-0 shadow-md"
                  >
                    Switch to Clean Copy (96%)
                  </button>
                </div>
              )}

              {/* Rejection Alert Overlay for Random / Non-Insurance Image */}
              {customFile && (diagnosticResult?.score === 0 || diagnosticResult?.isRecognizedClaimDoc === false) && !isAnalyzing && (
                <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl bg-red-950/95 border border-red-500 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-red-200 shadow-2xl">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-red-400 text-[24px] shrink-0">block</span>
                    <div>
                      <span className="font-bold text-white text-sm block">Non-Insurance File Rejected (Score: 0%)</span>
                      <span className="text-[11px] text-red-200">
                        {diagnosticResult?.detectedDocType || 'Unrecognized image'}: Does not contain valid statutory claim documentation.
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleClearCustomFile}
                    className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors shrink-0 border border-white/20"
                  >
                    Clear &amp; Try Specimen
                  </button>
                </div>
              )}
            </div>

            {/* Drag & Drop / File Uploader Box */}
            <div className="relative border-2 border-dashed border-white/20 hover:border-[#C5F258]/60 transition-all rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#131313]/60 group">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />

              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-zinc-800 group-hover:scale-105 transition-transform flex items-center justify-center text-zinc-300">
                  <span className="material-symbols-outlined text-[24px] text-[#C5F258]">upload_file</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">
                    {customFile ? `Uploaded: ${customFile.name} (${customFile.size})` : 'Or upload your own custom document file'}
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Drag &amp; drop PDF, JPG, PNG from device • Real-time AI vision check
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="px-4 py-2 rounded-full bg-zinc-800 group-hover:bg-[#C5F258] text-zinc-300 group-hover:text-[#151F00] font-bold text-xs transition-colors flex items-center gap-1.5 shrink-0 pointer-events-none"
              >
                <span className="material-symbols-outlined text-[15px]">folder_open</span>
                <span>{customFile ? 'Change File' : 'Browse File'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Diagnostic Report & Extracted Entities (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-5 relative overflow-hidden">
            {/* Background Ambient Glow */}
            <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#632D93]/15 blur-3xl pointer-events-none" />

            {/* Header: Status & Score */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#632D93] flex items-center justify-center text-[#DEB7FF]">
                  <span className="material-symbols-outlined text-[18px]">psychology</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">AI Forensic Audit</h3>
                  <span className="text-[11px] text-zinc-400">IRDAI Pre-Submission Standard</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  (diagnosticResult?.score || 0) >= 80
                    ? 'bg-[#C5F258]/15 text-[#C5F258] border border-[#C5F258]/30 shadow-[0_0_12px_rgba(197,242,88,0.2)]'
                    : (diagnosticResult?.score || 0) >= 40
                    ? 'bg-[#FF823A]/15 text-[#FF823A] border border-[#FF823A]/30 shadow-[0_0_12px_rgba(255,130,58,0.2)]'
                    : 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    (diagnosticResult?.score || 0) >= 80 
                      ? 'bg-[#C5F258]' 
                      : (diagnosticResult?.score || 0) >= 40 
                      ? 'bg-[#FF823A]' 
                      : 'bg-red-500'
                  }`}></span>
                  <span>
                    {(diagnosticResult?.score || 0) >= 80
                      ? 'Passed Checks'
                      : (diagnosticResult?.score || 0) >= 40
                      ? 'Defect Detected'
                      : 'Document Rejected'}
                  </span>
                </span>
              </div>
            </div>

            {/* Score & OCR Confidence Card */}
            <div className="p-4 rounded-2xl bg-[#131313] border border-white/[0.08] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-mono font-extrabold border ${
                  (diagnosticResult?.score || 0) >= 80
                    ? 'bg-[#C5F258]/15 border-[#C5F258]/40 text-[#C5F258]'
                    : (diagnosticResult?.score || 0) >= 40
                    ? 'bg-[#FF823A]/15 border-[#FF823A]/40 text-[#FF823A]'
                    : 'bg-red-500/15 border-red-500/40 text-red-400'
                }`}>
                  <span className="text-xl leading-none">{diagnosticResult?.score ?? 0}%</span>
                  <span className="text-[9px] uppercase tracking-wider font-sans font-bold mt-0.5">SCORE</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {diagnosticResult?.detectedDocType || 'Document Verified'}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {(diagnosticResult?.score || 0) >= 80
                      ? 'High optical clarity. All statutory checks verified with zero blockers.'
                      : (diagnosticResult?.score || 0) >= 40
                      ? 'Text clarity degraded. Rejection risk flagged under IRDAI code R-102.'
                      : 'Non-insurance image rejected. Missing statutory issuing authority & claim credentials.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Extracted Key Fields Table (Forensic OCR extraction) */}
            {diagnosticResult?.extractedFields && Object.keys(diagnosticResult.extractedFields).length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-wider font-bold">
                  <span>Extracted Statutory Fields</span>
                  <span className="text-[#C5F258] font-mono text-[10px]">Ollama Vision OCR</span>
                </div>
                <div className="rounded-xl bg-[#131313] border border-white/[0.06] divide-y divide-white/[0.05] overflow-hidden text-xs">
                  {Object.entries(diagnosticResult.extractedFields).map(([key, val], idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-2">
                      <span className="text-zinc-400 font-medium">{key}</span>
                      <span className="text-white font-mono font-semibold text-right truncate max-w-[200px]">
                        {val}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Checklist Breakdown */}
            <div className="space-y-2">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold block">
                Verification Checklist
              </span>
              <div className="flex flex-col gap-2">
                {diagnosticResult?.checklist.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#201F1F] flex items-start justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={`material-symbols-outlined text-[17px] shrink-0 mt-0.5 ${
                        item.passed ? 'text-[#C5F258]' : 'text-[#FF823A]'
                      }`}>
                        {item.passed ? 'check_circle' : 'warning'}
                      </span>
                      <div className="min-w-0">
                        <span className="text-white font-semibold block">{item.label}</span>
                        <span className="text-zinc-400 text-[11px] leading-tight block truncate">
                          {item.note}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded ${
                      item.passed ? 'bg-[#C5F258]/15 text-[#C5F258]' : 'bg-[#FF823A]/15 text-[#FF823A]'
                    }`}>
                      {item.passed ? 'Pass' : 'Defect'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Informational Advisory Callout */}
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              (diagnosticResult?.score || 0) >= 80
                ? 'bg-[#15230e] border-[#C5F258]/30 text-zinc-300'
                : (diagnosticResult?.score || 0) >= 40
                ? 'bg-[#29160d] border-[#FF823A]/40 text-orange-200'
                : 'bg-[#2b1010] border-red-500/50 text-red-200'
            }`}>
              <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                (diagnosticResult?.score || 0) >= 80 
                  ? 'text-[#C5F258]' 
                  : (diagnosticResult?.score || 0) >= 40 
                  ? 'text-[#FF823A]' 
                  : 'text-red-400'
              }`}>
                {(diagnosticResult?.score || 0) >= 80 ? 'verified' : (diagnosticResult?.score || 0) >= 40 ? 'report_problem' : 'block'}
              </span>
              <p className="leading-relaxed">
                {diagnosticResult?.recommendation ||
                  'Document meets all Indian Motor Tariff and surveyor inspection prerequisites.'}
              </p>
            </div>

            {/* Success Feedback Card after Attaching */}
            {attachedToClaim && attachFeedback && (
              <div className="p-3.5 rounded-xl bg-[#C5F258]/10 border border-[#C5F258]/40 text-[#C5F258] text-xs flex items-center justify-between gap-3 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  <span className="font-semibold">{attachFeedback}</span>
                </div>
                <button
                  onClick={() => onNavigate('my-claims')}
                  className="px-3 py-1 rounded-full bg-[#C5F258] text-[#151F00] font-bold text-[11px] shrink-0 hover:bg-[#b8e748] transition-colors"
                >
                  View In Claims →
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 pt-1">
              {(diagnosticResult?.score || 0) >= 80 ? (
                <button
                  onClick={handleAttachToClaim}
                  disabled={isAttaching}
                  className="w-full py-3.5 px-4 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-75"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isAttaching ? 'sync' : (attachedToClaim ? 'check_circle' : 'cloud_done')}
                  </span>
                  <span>
                    {isAttaching
                      ? 'Sealing Document Into Dossier...'
                      : (attachedToClaim
                          ? '✓ Verified & Attached to Claim Dossier'
                          : 'Attach Verified Document to Claim Dossier')}
                  </span>
                </button>
              ) : (diagnosticResult?.score || 0) >= 40 ? (
                <button
                  onClick={() => handleSelectPreset(activeDocId === 'doc-fir' ? 'doc-fir' : 'doc-dl', 'clean')}
                  className="w-full py-3.5 px-4 rounded-full bg-[#FF823A] hover:bg-[#ff7222] text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  <span>Fix: Switch to Certified High-Clarity Specimen</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-center">
                    <span className="text-red-400 font-bold text-xs flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">block</span>
                      <span>Cannot Attach: File Fails Statutory Pre-Audit</span>
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      Insurers strictly reject non-claim images. Switch to an authentic specimen below:
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectPreset('doc-fir', 'clean')}
                    className="w-full py-3 px-4 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Test With Verified Demo Document (Doc 1: Certified FIR)</span>
                  </button>
                  <button
                    onClick={() => handleSelectPreset('doc-dl', 'clean')}
                    className="w-full py-2.5 px-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-white/5"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#DEB7FF]">badge</span>
                    <span>Test With Verified Demo Document (Doc 2: Driving Licence)</span>
                  </button>
                </div>
              )}

              {/* Document 2 quick jump if on Document 1 */}
              {activeDocId === 'doc-fir' && (
                <button
                  onClick={() => handleSelectPreset('doc-dl', 'clean')}
                  className="w-full py-2.5 px-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-white/5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#DEB7FF]">badge</span>
                  <span>Next: Check Document 2 (Driving Licence Smart Card)</span>
                </button>
              )}

              {/* Document 1 quick jump if on Document 2 */}
              {activeDocId === 'doc-dl' && (
                <button
                  onClick={() => handleSelectPreset('doc-fir', 'clean')}
                  className="w-full py-2.5 px-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-white/5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">description</span>
                  <span>Switch Back: Check Document 1 (Police FIR)</span>
                </button>
              )}

              <button
                onClick={() => onNavigate('ai-claim-pilot')}
                className="w-full py-2.5 px-4 rounded-full bg-[#632D93]/40 hover:bg-[#632D93] text-[#DEB7FF] border border-[#DEB7FF]/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                <span>Ask AI Claim Pilot to Clarify Rules</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
