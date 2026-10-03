import React, { useState, useEffect } from 'react';
import { ScreenType, ClaimJourneyStep, ClaimDocument } from '../types';
import { HOTLINK_IMAGES, MOCK_DOCUMENTS } from '../data/mockData';
import { DBClaim } from '../../server/db';
import { updateClaim, seedSampleClaim } from '../services/api';

interface ClaimJourneyScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectDocument?: (doc: ClaimDocument) => void;
  onCheckDocument?: (doc: ClaimDocument) => void;
  initialStep?: ClaimJourneyStep;
  activeClaim?: DBClaim | null;
  onUpdateClaim?: (updated: DBClaim) => void;
  onOpenAiHelper?: (query?: string) => void;
}

export const ClaimJourneyScreen: React.FC<ClaimJourneyScreenProps> = ({
  onNavigate,
  onSelectDocument,
  onCheckDocument,
  initialStep = 2,
  activeClaim,
  onUpdateClaim,
  onOpenAiHelper
}) => {
  const [currentStep, setCurrentStep] = useState<ClaimJourneyStep>(initialStep);

  // Sync step if initialStep changes
  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);
  
  // Step 2 Verification State
  const [discrepancyChoice, setDiscrepancyChoice] = useState<'fir' | 'hospital'>('fir');
  const [isResolved, setIsResolved] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Step 4 Submit State
  const [consent1, setConsent1] = useState(true);
  const [consent2, setConsent2] = useState(true);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [showTransmitOverlay, setShowTransmitOverlay] = useState(false);

  const documents = activeClaim?.documents || MOCK_DOCUMENTS;
  const firDoc = documents.find(d => d.id === 'doc-fir') || documents[0];
  const dlDoc = documents.find(d => d.id === 'doc-dl') || documents[1];
  const rcDoc = documents.find(d => d.id === 'doc-rc') || documents[2];
  const estDoc = documents.find(d => d.id === 'doc-estimate') || documents[3];

  const handleResolveDiscrepancy = async () => {
    setIsResolving(true);
    if (activeClaim) {
      const updated = await updateClaim(activeClaim.id, {
        progressPercent: 90,
        status: 'ready'
      });
      if (updated && onUpdateClaim) onUpdateClaim(updated);
    }
    setTimeout(() => {
      setIsResolved(true);
      setIsResolving(false);
    }, 600);
  };

  const handleTriggerSubmission = async () => {
    if (!consent1 || !consent2) {
      alert('Please check all statutory consent declarations to authorize transmission.');
      return;
    }
    setShowTransmitOverlay(true);
    setIsTransmitting(true);

    if (activeClaim) {
      const updated = await updateClaim(activeClaim.id, {
        currentStep: 'success',
        status: 'submitted',
        progressPercent: 100
      });
      if (updated && onUpdateClaim) onUpdateClaim(updated);
    }

    setTimeout(() => {
      setIsTransmitting(false);
      setTimeout(() => {
        setShowTransmitOverlay(false);
        setCurrentStep('success');
      }, 800);
    }, 1200);
  };

  // If there is no active claim in the database (brand new account)
  if (!activeClaim) {
    return (
      <div className="flex flex-col w-full max-w-7xl mx-auto gap-8 pb-12 animate-fade-in">
        {/* Top Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-zinc-400 pb-2 border-b border-white/[0.06]">
          <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            <span>Home</span>
          </button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-zinc-300">My Claims</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-[#C5F258] font-semibold">Brand New Account</span>
        </div>

        {/* Empty State Hero Container */}
        <div className="p-8 sm:p-12 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] text-center max-w-3xl mx-auto flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#C5F258]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-[#632D93]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-3xl bg-[#C5F258]/10 border border-[#C5F258]/30 flex items-center justify-center text-[#C5F258] shadow-[0_0_30px_rgba(197,242,88,0.2)]">
            <span className="material-symbols-outlined text-[40px]">shield_check</span>
          </div>

          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5F258]/10 text-[#C5F258] text-xs font-bold border border-[#C5F258]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258]"></span>
              <span>Zero Active Claims • Clean Account</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display">
              Ready to file your first claim
            </h1>
            <p className="text-zinc-400 text-sm max-w-xl mx-auto leading-relaxed">
              You are currently on a brand-new account with no existing claim data. You can dictate what happened using our speech AI pilot, or test the step-by-step audit workflow with a sample claim.
            </p>
          </div>

          {/* Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-2 relative z-10">
            <button
              onClick={() => onNavigate('ai-claim-pilot')}
              className="p-5 rounded-2xl bg-[#632D93]/40 hover:bg-[#632D93]/60 border border-[#DEB7FF]/30 text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-44 group shadow-lg"
            >
              <div className="w-10 h-10 rounded-xl bg-[#632D93] flex items-center justify-center text-[#DEB7FF] mb-2">
                <span className="material-symbols-outlined text-[22px]">record_voice_over</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-[#DEB7FF] transition-colors flex items-center justify-between">
                  <span>Dictate Incident in AI Pilot</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </h3>
                <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                  Speak or type naturally. AI converts your voice directly into an active claim journey.
                </p>
              </div>
            </button>

            <button
              onClick={async () => {
                const sample = await seedSampleClaim();
                if (sample && onUpdateClaim) onUpdateClaim(sample);
              }}
              className="p-5 rounded-2xl bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-44 shadow-lg group"
            >
              <div className="w-10 h-10 rounded-xl bg-black/10 flex items-center justify-center text-[#151F00] mb-2">
                <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#151F00] flex items-center justify-between">
                  <span>Seed Test Claim (Hyundai Creta)</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </h3>
                <p className="text-xs text-[#263500] font-medium mt-1 leading-relaxed">
                  Instant sample claim with front bumper collision to test Step 2 dispute resolution.
                </p>
              </div>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500 pt-3 border-t border-white/[0.06] w-full relative z-10">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#C5F258]">verified</span>
              <span>DigiLocker Linked</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#DEB7FF]">policy</span>
              <span>3 Verified Policies</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#FFB691]">lock</span>
              <span>IRDAI Compliant Sandbox</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto gap-6 pb-12 animate-fade-in">
      {/* Top Navigation & Context Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1B1B] hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all text-xs font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to claims</span>
          </button>
          <span className="text-zinc-600">/</span>
          <span className="text-xs font-mono text-[#C5F258] uppercase tracking-wider font-semibold">
            CLAIM #{activeClaim.claimNumber} • {activeClaim.vehicle}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-pulse"></span>
            {currentStep === 'success' ? 'Submitted & Cryptographically Sealed' : 
             currentStep === 3 ? '100% Ready to Submit' : 
             currentStep === 4 ? 'Final Gateway Authorization' : 'Audit In Progress'}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#1C1B1B] text-zinc-300 text-xs">
            <span className="material-symbols-outlined text-[14px] text-[#DEB7FF]">verified_user</span>
            <span>IRDAI Compliant</span>
          </span>
        </div>
      </div>

      {/* Claim Header Title Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[#C5F258] text-[18px]">directions_car</span>
            <span>Motor Insurance Claim</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight font-display">
            Accident Damage — Front & Quarter Panel
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm mt-1 max-w-3xl">
            {currentStep === 'success' 
              ? 'Your claim is officially registered with HDFC ERGO General Insurance. Physical inspection scheduled.'
              : 'Your dossier is actively synthesized and audited for zero rejection risk before insurer transmission.'}
          </p>
        </div>

        {/* Quick Stepper Jump Pill for demo fluidity */}
        <div className="flex items-center gap-1 bg-[#1C1B1B] p-1 rounded-full border border-white/[0.08] text-xs self-start md:self-auto">
          <span className="px-2 text-zinc-500 font-mono text-[10px]">STAGE:</span>
          {[1, 2, 3, 4].map((stepNum) => (
            <button
              key={stepNum}
              onClick={() => setCurrentStep(stepNum as ClaimJourneyStep)}
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold transition-all ${
                currentStep === stepNum
                  ? 'bg-[#C5F258] text-[#151F00]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {stepNum}
            </button>
          ))}
          <button
            onClick={() => setCurrentStep('success')}
            className={`px-3 py-1 rounded-full font-bold transition-all ${
              currentStep === 'success'
                ? 'bg-[#C5F258] text-[#151F00]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            ✓ Done
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4-STAGE HORIZONTAL WORKFLOW STEPPER                                       */}
      {/* ========================================================================= */}
      <div className="w-full bg-[#1C1B1B] rounded-2xl p-4 shadow-sm border border-white/[0.08]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Step 1: Documents */}
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              currentStep === 1
                ? 'bg-[#C5F258] text-[#151F00] shadow-[0_0_20px_rgba(197,242,88,0.3)]'
                : 'bg-zinc-800/60 hover:bg-zinc-800 text-white'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              currentStep === 1 ? 'bg-[#151F00] text-[#C5F258]' : 'bg-[#C5F258]/20 text-[#C5F258]'
            }`}>
              <span className="material-symbols-outlined text-[18px] font-bold">check</span>
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                currentStep === 1 ? 'text-[#394D00]' : 'text-zinc-400'
              }`}>
                Step 1 {currentStep === 1 ? '• Active' : ''}
              </span>
              <span className="text-xs sm:text-sm font-bold truncate block">Documents</span>
            </div>
          </div>

          {/* Step 2: Verification */}
          <div
            onClick={() => setCurrentStep(2)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              currentStep === 2
                ? 'bg-[#DEB7FF] text-[#2D0050] shadow-[0_0_20px_rgba(222,183,255,0.3)]'
                : isResolved || currentStep === 3 || currentStep === 4 || currentStep === 'success'
                ? 'bg-zinc-800/60 hover:bg-zinc-800 text-white'
                : 'bg-[#141414] text-zinc-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              currentStep === 2 ? 'bg-[#2D0050] text-[#DEB7FF]' : 'bg-[#C5F258]/20 text-[#C5F258]'
            }`}>
              <span className="material-symbols-outlined text-[18px] font-bold">
                {currentStep === 2 ? 'troubleshoot' : 'check'}
              </span>
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                currentStep === 2 ? 'text-[#490B78]' : 'text-zinc-400'
              }`}>
                Step 2 {currentStep === 2 ? '• Active' : ''}
              </span>
              <span className="text-xs sm:text-sm font-bold truncate block">Verification</span>
            </div>
          </div>

          {/* Step 3: Ready */}
          <div
            onClick={() => setCurrentStep(3)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              currentStep === 3
                ? 'bg-[#C5F258] text-[#151F00] shadow-[0_0_24px_rgba(197,242,88,0.35)]'
                : currentStep === 4 || currentStep === 'success'
                ? 'bg-zinc-800/60 text-white'
                : 'bg-[#141414] text-zinc-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              currentStep === 3 ? 'bg-[#151F00] text-[#C5F258]' : 'bg-zinc-800 text-zinc-400'
            }`}>
              <span className="material-symbols-outlined text-[18px] font-bold">
                {currentStep === 3 ? 'task_alt' : '3'}
              </span>
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                currentStep === 3 ? 'text-[#394D00]' : 'text-zinc-400'
              }`}>
                Step 3 {currentStep === 3 ? '• Active' : ''}
              </span>
              <span className="text-xs sm:text-sm font-bold truncate block">Claim Ready (100%)</span>
            </div>
          </div>

          {/* Step 4: Submit */}
          <div
            onClick={() => setCurrentStep(4)}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
              currentStep === 4 || currentStep === 'success'
                ? 'bg-[#C5F258] text-[#151F00] shadow-[0_0_24px_rgba(197,242,88,0.35)]'
                : 'bg-[#141414] text-zinc-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              currentStep === 4 || currentStep === 'success' ? 'bg-[#151F00] text-[#C5F258]' : 'bg-zinc-800 text-zinc-400'
            }`}>
              <span className="material-symbols-outlined text-[18px] font-bold">
                {currentStep === 'success' ? 'done_all' : 'send'}
              </span>
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] uppercase font-bold tracking-wider block ${
                currentStep === 4 ? 'text-[#394D00]' : 'text-zinc-400'
              }`}>
                Step 4 {currentStep === 4 ? '• Active' : ''}
              </span>
              <span className="text-xs sm:text-sm font-bold truncate block">Final Submit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: DOCUMENTS (SCREEN 6)                                              */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#1C1B1B] rounded-3xl p-6 border border-white/[0.08] shadow-xl flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base md:text-lg font-bold text-white font-display">
                    Step 1: Upload & Organize Required Documents
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">Submit high-clarity original scans or photos to unlock instant AI pre-validation.</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-[#C5F258] text-xs font-bold self-start sm:self-auto">
                  2 of 4 Ready
                </span>
              </div>

              {/* Document Stack */}
              <div className="space-y-3">
                {/* 1. FIR (Primary Demo Doc 1) */}
                <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  firDoc.verified || firDoc.status === 'verified'
                    ? 'bg-[#1C1B1B] border-[#C5F258]/30 shadow-[0_0_15px_rgba(197,242,88,0.1)]'
                    : 'bg-[#201F1F] border-white/[0.06]'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      firDoc.verified || firDoc.status === 'verified'
                        ? 'bg-[#C5F258]/15 text-[#C5F258]'
                        : 'bg-zinc-800 text-white'
                    }`}>
                      <span className="material-symbols-outlined text-[24px]">
                        {firDoc.verified || firDoc.status === 'verified' ? 'verified' : 'description'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">1. FIR (First Information Report)</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          firDoc.verified || firDoc.status === 'verified'
                            ? 'bg-[#C5F258]/20 text-[#C5F258]'
                            : 'bg-[#FF823A]/20 text-[#FF823A]'
                        }`}>
                          {firDoc.verified || firDoc.status === 'verified'
                            ? `✓ AI Verified (${firDoc.diagnosticScore || 96}%)`
                            : '⚠️ Pre-Audit Needed (Score: 41%)'}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono mt-0.5 block truncate">
                        {firDoc.fileName || 'station_diary_gd882_certified.pdf'} • {firDoc.fileSize || '2.4 MB'}
                        {(firDoc.verified || firDoc.status === 'verified') && (
                          <span className="text-[#C5F258] font-bold"> • Certified GD-882 Verified</span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button 
                      onClick={() => onSelectDocument?.(firDoc)}
                      className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                      title="Inspect Specimen"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                    </button>
                    <button 
                      onClick={() => (onCheckDocument ? onCheckDocument(firDoc) : onNavigate('check-document'))}
                      className="px-3.5 py-1.5 rounded-full bg-[#632D93]/40 hover:bg-[#632D93] text-[#DEB7FF] border border-[#DEB7FF]/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>{firDoc.verified || firDoc.status === 'verified' ? 'Re-Check AI' : '⚡ Run AI Check'}</span>
                    </button>
                  </div>
                </div>

                {/* 2. DL (Primary Demo Doc 2) */}
                <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  dlDoc.verified || dlDoc.status === 'verified'
                    ? 'bg-[#1C1B1B] border-[#DEB7FF]/30 shadow-[0_0_15px_rgba(222,183,255,0.1)]'
                    : 'bg-[#201F1F] border-white/[0.06]'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#DEB7FF]/15 text-[#DEB7FF] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">badge</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">2. Driving Licence</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#DEB7FF]/20 text-[#DEB7FF] text-[10px] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">check</span>
                          <span>✓ AI Verified ({dlDoc.diagnosticScore || 99}%)</span>
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono mt-0.5 block truncate">
                        {dlDoc.fileName || 'driving_licence_smartcard.png'} • 1.8 MB <span className="text-[#DEB7FF] font-bold">• Sarathi LMV-NT Valid</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button 
                      onClick={() => onSelectDocument?.(dlDoc)}
                      className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                      title="Inspect Specimen"
                    >
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                    </button>
                    <button 
                      onClick={() => (onCheckDocument ? onCheckDocument(dlDoc) : onNavigate('check-document'))}
                      className="px-3.5 py-1.5 rounded-full bg-[#632D93]/40 hover:bg-[#632D93] text-[#DEB7FF] border border-[#DEB7FF]/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      <span>⚡ Run AI Check</span>
                    </button>
                  </div>
                </div>

                {/* 3. RC (Dropzone or Attached) */}
                <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  rcDoc.verified || rcDoc.status === 'verified'
                    ? 'bg-[#1C1B1B] border-[#C5F258]/30 shadow-[0_0_15px_rgba(197,242,88,0.1)]'
                    : 'bg-[#141414] border-dashed border-white/20'
                }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-zinc-800 text-[#C5F258] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">assignment</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">3. Vehicle Registration (RC Card)</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rcDoc.verified || rcDoc.status === 'verified'
                            ? 'bg-[#C5F258]/20 text-[#C5F258]'
                            : 'bg-[#FF823A]/15 text-[#FF823A]'
                        }`}>
                          {rcDoc.verified || rcDoc.status === 'verified' ? `✓ AI Verified (${rcDoc.diagnosticScore || 98}%)` : 'Required'}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500 block truncate">
                        {rcDoc.verified ? 'rc_smartcard_form23.png • VAHAN KA-05 Matched' : 'Smart Card front & back scan • Supports PDF, JPG, PNG'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => (onCheckDocument ? onCheckDocument(rcDoc) : onNavigate('check-document'))}
                    className="px-4 py-2 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs shadow-md shrink-0 self-end sm:self-auto flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">document_scanner</span>
                    <span>{rcDoc.verified ? 'Re-Audit RC' : 'Check RC with AI'}</span>
                  </button>
                </div>

                {/* 4. Repair Estimate */}
                <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-zinc-800 text-zinc-500 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[24px]">request_quote</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">4. Repair Estimate</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#FF823A]/15 text-[#FF823A] text-[10px] font-bold">
                          Required
                        </span>
                      </div>
                      <span className="text-xs text-zinc-500">Cashless garage preliminary estimate or quotation sheet</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onNavigate('check-document')}
                    className="px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold shrink-0"
                  >
                    Upload Estimate
                  </button>
                </div>
              </div>
            </div>

            {/* Inspected Lot / Vehicle Card */}
            <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.08] flex items-center gap-4">
              <img
                src={HOTLINK_IMAGES.inspectionLot}
                alt="Inspected Vehicle Lot"
                referrerPolicy="no-referrer"
                className="w-24 h-20 rounded-xl object-cover shrink-0 border border-white/10"
              />
              <div>
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold block">
                  Registered Vehicle
                </span>
                <h4 className="text-sm font-bold text-white">2022 Hyundai Creta SX(O) Turbo</h4>
                <div className="flex flex-wrap gap-x-4 text-xs text-zinc-400 mt-1">
                  <span>Reg: <strong className="text-white font-mono">DL 01 AB 8392</strong></span>
                  <span>Chassis: <strong className="text-white font-mono">...884920B</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI Document Checklist (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#632D93] flex items-center justify-center text-[#DEB7FF]">
                    <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">AI Document Checklist</h3>
                    <span className="text-[11px] text-[#DEB7FF]">IRDAI Compliance Engine v4.2</span>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-[#632D93]/40 text-[#DEB7FF] text-[10px] font-bold">
                  Contextual Guidance
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#201F1F] flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#C5F258] text-[20px] shrink-0 mt-0.5">verified_user</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">RC & Policy Schedule Linkage</span>
                    <span className="text-zinc-400 mt-0.5 block leading-relaxed">
                      Confirms insurable interest and validates non-transfer of ownership during policy period.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#201F1F] flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#DEB7FF] text-[20px] shrink-0 mt-0.5">fact_check</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">FIR / Police GD Entry Mandate</span>
                    <span className="text-zinc-400 mt-0.5 block leading-relaxed">
                      Mandatory for major third-party structural impacts, fire, or pedestrian incident claims.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#201F1F] flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#FFB691] text-[20px] shrink-0 mt-0.5">build_circle</span>
                  <div className="text-xs">
                    <span className="font-bold text-white block">Workshop Estimate Audit</span>
                    <span className="text-zinc-400 mt-0.5 block leading-relaxed">
                      Establishes preliminary Loss Reserve to expedite instantaneous surveyor sign-off.
                    </span>
                  </div>
                </div>
              </div>

              {/* Smart Tip */}
              <div className="p-4 rounded-2xl bg-[#2A2A2A] border border-white/[0.08] flex items-start gap-3">
                <span className="material-symbols-outlined text-[#C5F258] text-[22px] shrink-0">tips_and_updates</span>
                <div>
                  <span className="text-xs font-bold text-[#C5F258] uppercase tracking-wider block">Smart Tip</span>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Ensure your Vehicle RC chassis number matches the policy schedule precisely to avoid pre-inspection delays.
                  </p>
                </div>
              </div>

              {/* Step CTA */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-3.5 px-6 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-sm shadow-[0_4px_20px_-2px_rgba(197,242,88,0.35)] transition-all flex items-center justify-center gap-2"
                >
                  <span>Continue to Verification</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                <button
                  onClick={() => onNavigate('ai-claim-pilot')}
                  className="w-full py-2.5 px-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>Ask AI Claim Pilot about missing docs</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: VERIFICATION (SCREEN 9)                                           */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Verification & Discrepancy Resolution */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#1C1B1B] rounded-3xl p-6 border border-white/[0.08] shadow-xl flex flex-col gap-6">
              {/* Readiness Score Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#141414] border border-white/[0.06]">
                <div>
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Readiness Assessment</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-extrabold text-white font-display">
                      {isResolved ? '100%' : '75%'}
                    </span>
                    <span className="text-xs text-zinc-400">Claim file integrity</span>
                  </div>
                  <p className="text-[11px] text-[#C5F258] mt-0.5 font-medium">
                    {isResolved ? 'All 4 automated validation checks passed' : '3 of 4 automated validation checks passed'}
                  </p>
                </div>

                <div className="w-full sm:w-48 flex flex-col gap-2">
                  <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full bg-[#C5F258] rounded-full shadow-[0_0_12px_rgba(197,242,88,0.5)] transition-all duration-700"
                      style={{ width: isResolved ? '100%' : '75%' }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-zinc-400">
                    <span>Gate: 100% required</span>
                    <span className={isResolved ? 'text-[#C5F258] font-bold' : 'text-[#FF823A] font-bold'}>
                      {isResolved ? '0 Blockers' : '1 Warning'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Automated AI Audit Checks */}
              <div className="flex flex-col gap-3">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold px-1">
                  Automated AI Audit Checks
                </span>

                {/* Check 1 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#C5F258] text-[20px]">check_circle</span>
                    <div>
                      <span className="text-xs font-bold text-white block">Required documents</span>
                      <span className="text-[11px] text-zinc-400">FIR, Repair Estimate, Policy Doc & Medical Intake uploaded</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                    Complete
                  </span>
                </div>

                {/* Check 2 (Document Quality & AI Audit) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04] gap-3">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#C5F258] text-[20px]">document_scanner</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white block">Document quality & forensic check (OCR & blur test)</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          firDoc.verified || firDoc.status === 'verified'
                            ? 'bg-[#C5F258]/15 text-[#C5F258]'
                            : 'bg-[#FF823A]/15 text-[#FF823A]'
                        }`}>
                          {firDoc.verified || firDoc.status === 'verified' ? 'Passed Checks' : 'Audit Needed'}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 mt-0.5 block">
                        {firDoc.verified || firDoc.status === 'verified'
                          ? `Demo documents verified: FIR (Score: ${firDoc.diagnosticScore || 96}%), DL (Score: ${dlDoc.diagnosticScore || 99}%)`
                          : 'Police FIR scan requires verification before insurer submission.'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => (onCheckDocument ? onCheckDocument(firDoc) : onNavigate('check-document'))}
                    className="px-3 py-1.5 rounded-full bg-[#632D93]/40 hover:bg-[#632D93] text-[#DEB7FF] border border-[#DEB7FF]/30 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 self-end sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    <span>{firDoc.verified || firDoc.status === 'verified' ? 'Re-Audit Specimen' : '⚡ Run AI Document Check'}</span>
                  </button>
                </div>

                {/* Check 3 */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#C5F258] text-[20px]">verified_user</span>
                    <div>
                      <span className="text-xs font-bold text-white block">Required fields (Policy no, Chassis no)</span>
                      <span className="text-[11px] text-zinc-400">Chassis #MA3ERB... and Policy matched across all records</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                    Complete
                  </span>
                </div>

                {/* Check 4 (Flagged or Resolved) */}
                <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                  isResolved
                    ? 'bg-[#201F1F] border-white/[0.04]'
                    : 'bg-[#2B1B15] border-[#FF823A]/40 shadow-md'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[20px] ${
                      isResolved ? 'text-[#C5F258]' : 'text-[#FF823A]'
                    }`}>
                      {isResolved ? 'check_circle' : 'error'}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-white block">Cross-document verification</span>
                      <span className={`text-[11px] ${isResolved ? 'text-zinc-400' : 'text-[#FFB691]'}`}>
                        {isResolved 
                          ? 'Timeline incongruence sealed via statutory rider affidavit' 
                          : 'Timeline incongruence detected in chronological narrative'}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    isResolved 
                      ? 'bg-[#C5F258]/15 text-[#C5F258]' 
                      : 'bg-[#FF823A]/20 text-[#FF823A]'
                  }`}>
                    {isResolved ? 'Resolved' : '1 issue found'}
                  </span>
                </div>
              </div>

              {/* Date Discrepancy Resolution Form */}
              {!isResolved ? (
                <div className="p-5 rounded-2xl bg-[#251B17] border border-[#FF823A]/30 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#FF823A] text-black flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                      !
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Date discrepancy detected</h4>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        Accident date in <span className="font-semibold text-white underline">FIR states 10 September 2024</span>, but hospital casualty admission slip indicates <span className="font-semibold text-white underline">12 September 2024</span>. Please verify which date is correct or clarify delayed medical admission.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <label 
                      onClick={() => setDiscrepancyChoice('fir')}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        discrepancyChoice === 'fir'
                          ? 'bg-[#201F1F] border-[#C5F258]'
                          : 'bg-[#181818] border-white/[0.08] hover:bg-zinc-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="choice"
                        checked={discrepancyChoice === 'fir'}
                        onChange={() => setDiscrepancyChoice('fir')}
                        className="mt-1 accent-[#C5F258]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">Select FIR Date (10 Sep) — Add delayed treatment note</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-800 text-[#C5F258]">
                            Recommended
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          Accident occurred on 10 Sep; driver opted for local home first-aid before acute symptoms worsened on 12 Sep. AI will auto-append an affidavit rider.
                        </p>
                      </div>
                    </label>

                    <label 
                      onClick={() => setDiscrepancyChoice('hospital')}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                        discrepancyChoice === 'hospital'
                          ? 'bg-[#201F1F] border-[#C5F258]'
                          : 'bg-[#181818] border-white/[0.08] hover:bg-zinc-800'
                      }`}
                    >
                      <input
                        type="radio"
                        name="choice"
                        checked={discrepancyChoice === 'hospital'}
                        onChange={() => setDiscrepancyChoice('hospital')}
                        className="mt-1 accent-[#C5F258]"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-white">Select Hospital Date (12 Sep) — Upload revised police memo</span>
                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                          Accident actually occurred on 12 Sep and police station entered clerical typo. Requires supplementary station diary extract.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isResolving}
                      onClick={handleResolveDiscrepancy}
                      className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {isResolving ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                          <span>Re-indexing Claim Data...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">verified</span>
                          <span>Resolve Discrepancy & Re-verify</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('ai-claim-pilot')}
                      className="w-full sm:w-auto px-4 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                    >
                      Ask AI Pilot Custom Question
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#C5F258]/10 border border-[#C5F258]/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#C5F258] text-[24px]">task_alt</span>
                    <div>
                      <span className="text-xs font-bold text-[#C5F258] block">Discrepancy Formally Sealed</span>
                      <span className="text-[11px] text-zinc-300">Affidavit rider #AF-921 added to evidentiary package. Readiness score 100%.</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="px-4 py-2 rounded-full bg-[#C5F258] text-[#151F00] font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Proceed to Step 3</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              )}

              {/* Scanned Document References */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-zinc-400 text-[18px]">folder_shared</span>
                    Extracted Document References
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">OCR Source Files</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div 
                    onClick={() => onSelectDocument?.(firDoc)}
                    className="p-3 rounded-xl bg-[#1C1B1B] hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3 border border-white/[0.06]"
                  >
                    <img
                      src={HOTLINK_IMAGES.firDetail}
                      alt="FIR snippet"
                      referrerPolicy="no-referrer"
                      className="w-12 h-14 object-cover rounded-lg shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white truncate block">FIR_Police_Stn_49.pdf</span>
                      <span className="text-[11px] text-zinc-400 block">Date logged: 10/09/2024</span>
                      <span className="text-[10px] text-[#C5F258] font-medium">Page 1, Paragraph 3</span>
                    </div>
                  </div>

                  <div 
                    onClick={() => onNavigate('check-document')}
                    className="p-3 rounded-xl bg-[#1C1B1B] hover:bg-zinc-800 transition-colors cursor-pointer flex items-center gap-3 border border-white/[0.06]"
                  >
                    <img
                      src={HOTLINK_IMAGES.medicalSlip}
                      alt="Casualty Slip snippet"
                      referrerPolicy="no-referrer"
                      className="w-12 h-14 object-cover rounded-lg shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-white truncate block">CityCare_Casualty_Slip.pdf</span>
                      <span className="text-[11px] text-[#FFB691] block">Admit date: 12/09/2024</span>
                      <span className="text-[10px] text-[#FF823A] font-medium">Triage Tag #4092</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI Suggestion & Impact Analysis */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#DEB7FF] via-[#632D93] to-[#C5F258]" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#632D93] flex items-center justify-center text-[#DEB7FF]">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                  </div>
                  <h3 className="text-base font-bold text-white">AI Suggestion & Impact</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#DEB7FF]/10 text-[#DEB7FF]">
                  Diagnostic Engine v2.4
                </span>
              </div>

              {/* Quote Reasoning Box */}
              <div className="p-4 rounded-2xl bg-[#201F1F] text-xs text-zinc-300 leading-relaxed space-y-2">
                <p>
                  "Insurers automatically dispute accidental injury claims if the police FIR date precedes hospital trauma admission by more than 24 hours without an explanation letter. Resolving this discrepancy now will bring your Claim Readiness to <strong className="text-[#C5F258]">100%</strong>."
                </p>
                <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2 text-zinc-400 text-[11px]">
                  <span className="material-symbols-outlined text-[#DEB7FF] text-[15px]">shield</span>
                  <span>Underwriting risk assessment: Dropped from High to Zero</span>
                </div>
              </div>

              {/* Side-by-Side Comparison */}
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">
                  Side-by-Side Date Comparison
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#201F1F]">
                    <span className="text-[11px] text-zinc-400 block">FIR Report</span>
                    <span className="text-base font-bold text-white mt-1 block">10-SEP-2024</span>
                    <span className="text-[10px] text-[#C5F258] flex items-center gap-1 mt-2">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span> Verified stamp
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#2B1B15] border border-[#FF823A]/30">
                    <span className="text-[11px] text-[#FFB691] block">Hospital Admit</span>
                    <span className="text-base font-bold text-[#FF823A] mt-1 block">12-SEP-2024</span>
                    <span className="text-[10px] text-[#FF823A] flex items-center gap-1 mt-2">
                      <span className="material-symbols-outlined text-[13px]">flag</span> Discrepancy (+48h)
                    </span>
                  </div>
                </div>
              </div>

              {/* Anticipated Speed */}
              <div className="p-3.5 rounded-xl bg-[#201F1F] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#C5F258]/20 text-[#C5F258] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">trending_up</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Anticipated Settlement Speed</span>
                  <span className="text-[11px] text-zinc-400">4-6 Business Days with clean pre-audit documentation</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-full py-3.5 px-6 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Verify & Mark Ready</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onNavigate('ai-claim-pilot')}
                    className="py-2.5 px-3 rounded-full bg-[#632D93]/40 hover:bg-[#632D93] text-[#DEB7FF] text-xs font-semibold flex items-center justify-center gap-1 border border-[#DEB7FF]/30"
                  >
                    <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                    <span>Ask AI Pilot</span>
                  </button>
                  <button
                    onClick={handleResolveDiscrepancy}
                    className="py-2.5 px-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                    <span>Run Re-check</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: CLAIM READY 100% (SCREEN 5)                                       */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Dossier Health & Audit Verification (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* 100% Gauge Card */}
            <div className="bg-[#1C1B1B] rounded-3xl p-6 md:p-8 border border-white/[0.08] shadow-xl relative overflow-hidden">
              <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#C5F258]/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-5">
                  {/* Radial Gauge */}
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-24 h-24 -rotate-90 transform" viewBox="0 0 96 96">
                      <circle cx="48" cy="48" r="40" stroke="#353534" strokeWidth="7" fill="transparent" />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#C5F258"
                        strokeWidth="7"
                        strokeDasharray="251.32"
                        strokeDashoffset="0"
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-extrabold text-white font-display leading-none">100%</span>
                      <span className="text-[9px] text-[#C5F258] font-bold uppercase mt-0.5">Ready</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white font-display">Claim Ready Dossier</h2>
                      <span className="material-symbols-outlined text-[#C5F258] text-[20px]">check_circle</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">ClaimEase Statutory Shield Passed • Carrier Underwriting Pre-Cleared</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#DEB7FF] bg-[#632D93]/30 px-2.5 py-0.5 rounded-full mt-2 border border-[#DEB7FF]/30">
                      <span className="material-symbols-outlined text-[13px]">psychology</span>
                      Claim Pilot Synthesis: 0 Blockers
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#141414] border border-white/[0.06] text-right">
                  <span className="text-[10px] text-zinc-400 block uppercase">Rejection Probability</span>
                  <span className="text-2xl font-extrabold text-[#C5F258] font-display">0.00%</span>
                  <span className="text-[10px] text-zinc-500 block">Autonomous pre-check</span>
                </div>
              </div>

              {/* 4 Audited Checks */}
              <div className="space-y-3 pt-4">
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold block mb-1">
                  Autonomous Verification Audit Matrix
                </span>

                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-[#201F1F]">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#C5F258] text-[18px] shrink-0 mt-0.5">done_all</span>
                    <div>
                      <span className="text-xs font-bold text-white block">Required Primary Documents</span>
                      <span className="text-[11px] text-zinc-400">Policy covernote, FIR slip, driver credential & estimation invoice reconciled.</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold shrink-0">
                    4/4 Verified
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-[#201F1F]">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#C5F258] text-[18px] shrink-0 mt-0.5">document_scanner</span>
                    <div>
                      <span className="text-xs font-bold text-white block">Document Quality & OCR Confidence</span>
                      <span className="text-[11px] text-zinc-400">High-density optical character scan with zero illegible forensic anomalies detected.</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold shrink-0">
                    99.4% Match
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-[#201F1F]">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#C5F258] text-[18px] shrink-0 mt-0.5">fingerprint</span>
                    <div>
                      <span className="text-xs font-bold text-white block">Metadata & Entity Alignment</span>
                      <span className="text-[11px] text-zinc-400">Vehicle Reg (DL-01-AB-8392), Chassis #884920B, and Policyholder Name synced.</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold shrink-0">
                    Exact Identity
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl bg-[#201F1F]">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#DEB7FF] text-[18px] shrink-0 mt-0.5">auto_fix_high</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Timeline & Incident Reconciliation</span>
                        <span className="text-[9px] bg-[#632D93] text-[#DEB7FF] px-1.5 py-0.2 rounded font-bold">AI Clarified</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 mt-0.5 block">Resolved 18-hour hospitalization gap. Formal addendum generated and sealed to prevent Section 64-VB objections.</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#632D93]/40 text-[#DEB7FF] text-[10px] font-bold shrink-0">
                    Validated
                  </span>
                </div>
              </div>
            </div>

            {/* Settlement & Cashless Garage Card */}
            <div className="bg-[#1C1B1B] rounded-3xl p-6 border border-white/[0.08] shadow-xl flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
                <div>
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold">Calculated Settlement</span>
                  <h3 className="text-lg font-bold text-white font-display mt-0.5">Estimated Approved Payout</h3>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-3xl font-extrabold text-[#C5F258] font-display">₹48,500</div>
                  <span className="text-xs text-zinc-400">90% of billed estimate • Zero co-pay deduction</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="bg-[#201F1F] p-4 rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#C5F258] text-[22px] shrink-0 mt-0.5">store</span>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Preferred Cashless Garage</span>
                    <span className="text-xs font-bold text-white block mt-0.5">Apex Multi-Brand Autoworks</span>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block">Direct insurer settlement enabled. Out-of-pocket: ₹0.</span>
                  </div>
                </div>

                <div className="bg-[#201F1F] p-4 rounded-2xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#DEB7FF] text-[22px] shrink-0 mt-0.5">receipt_long</span>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Deductible Structure</span>
                    <span className="text-xs font-bold text-white block mt-0.5">Standard Compulsory ₹1,000</span>
                    <span className="text-[11px] text-zinc-400 mt-0.5 block">Consumables allowance of ₹4,700 automatically recovered.</span>
                  </div>
                </div>
              </div>

              {/* Map Preview */}
              <div className="relative rounded-2xl overflow-hidden h-36 border border-white/10 mt-1">
                <img
                  src={HOTLINK_IMAGES.map}
                  alt="Apex Multi-Brand Autoworks Map"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3.5">
                  <div className="flex items-center gap-1.5 text-xs text-white">
                    <span className="material-symbols-outlined text-[#C5F258] text-[18px]">location_on</span>
                    <span>Apex Autoworks • 4.2 km from registered address</span>
                  </div>
                  <span className="text-[10px] font-bold text-[#C5F258] bg-black/60 px-2.5 py-1 rounded-full backdrop-blur">
                    Surge Priority Pass
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Manifest & Submission Actions (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#1C1B1B] rounded-3xl p-6 border border-white/[0.08] shadow-xl flex flex-col gap-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div>
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold block">Pre-Flight Package</span>
                  <h3 className="text-base font-bold text-white font-display">Compiled File Manifest</h3>
                </div>
                <span className="text-xs bg-zinc-800 text-zinc-200 px-3 py-1 rounded-full font-semibold">
                  4 Files • 5.55 MB
                </span>
              </div>

              {/* Manifest list */}
              <div className="space-y-2.5">
                {[
                  { name: 'FIR Accident Report', size: 'PDF • 1.4 MB', tag: 'Signed & Sealed', icon: 'picture_as_pdf' },
                  { name: 'Driving Licence (Both Sides)', size: 'PNG • 2.1 MB', tag: 'Valid until 2031', icon: 'badge' },
                  { name: 'Vehicle Registration (RC)', size: 'PDF • 850 KB', tag: 'Active Fitness Cert', icon: 'assignment' },
                  { name: 'Initial Repair Estimate (₹54,200)', size: 'PDF • 1.2 MB', tag: 'Itemized & Audited', icon: 'calculate' },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-[#201F1F] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[#C5F258] shrink-0">
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block">{item.name}</span>
                        <span className="text-[11px] text-zinc-400 font-mono">{item.tag} • {item.size}</span>
                      </div>
                    </div>
                    <span className="w-6 h-6 rounded-full bg-[#C5F258]/20 text-[#C5F258] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                    </span>
                  </div>
                ))}
              </div>

              {/* Zero Rejection Guarantee */}
              <div className="p-4 rounded-2xl bg-[#252424] flex items-start gap-3">
                <span className="material-symbols-outlined text-[#C5F258] text-[20px] shrink-0 mt-0.5">verified</span>
                <div>
                  <span className="text-xs font-bold text-white block">Zero Rejection Guarantee</span>
                  <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                    All 4 documents satisfy <strong className="text-white">IRDAI claims circulars</strong> and <strong className="text-white">HDFC ERGO automated underwriting criteria</strong>.
                  </p>
                </div>
              </div>

              {/* Thumbnails row */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {[
                  { img: HOTLINK_IMAGES.fir, label: 'FIR', doc: firDoc },
                  { img: HOTLINK_IMAGES.dl, label: 'DL', doc: dlDoc },
                  { img: HOTLINK_IMAGES.rc, label: 'RC', doc: rcDoc },
                  { img: HOTLINK_IMAGES.estimate, label: 'EST', doc: estDoc }
                ].map((thumb, tIdx) => (
                  <div
                    key={tIdx}
                    onClick={() => onSelectDocument?.(thumb.doc)}
                    className="relative w-20 h-28 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-black cursor-pointer group"
                  >
                    <img
                      src={thumb.img}
                      alt={thumb.label}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 bg-black/80 rounded text-white">
                      {thumb.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="w-full py-4 px-6 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-sm shadow-[0_4px_24px_-4px_rgba(197,242,88,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <span>Proceed to Final Submission</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => alert('Dossier zip compiled: MOT-9284-IN-Dossier.pdf (5.55 MB)')}
                    className="py-2.5 px-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">download</span>
                    <span>Download Dossier</span>
                  </button>
                  <button
                    onClick={() => onNavigate('ai-claim-pilot')}
                    className="py-2.5 px-3 rounded-full bg-[#632D93]/40 hover:bg-[#632D93] text-[#DEB7FF] text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#DEB7FF]/30"
                  >
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    <span>Ask Claim Pilot</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: SUBMIT / INSURER DIRECT TRANSMISSION (SCREEN 8)                   */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Transmission Payload & Statutory Consent (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[#1C1B1B] rounded-3xl p-6 md:p-8 border border-white/[0.08] shadow-xl flex flex-col gap-6">
              {/* Direct Handshake Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-[#C5F258]">
                    <span className="material-symbols-outlined text-[26px]">hub</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                      Direct API Handshake
                    </span>
                    <h2 className="text-xl font-bold text-white font-display">Insurer Direct Transmission Gateway</h2>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#632D93]/40 border border-[#DEB7FF]/30 text-[#DEB7FF] text-xs font-bold">
                  <span className="material-symbols-outlined text-[13px]">lock</span>
                  <span>Encrypted Webhook 2.4</span>
                </span>
              </div>

              {/* Carrier Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 rounded-2xl bg-[#201F1F]">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Underwriting Carrier</span>
                  <p className="text-sm font-bold text-white">HDFC ERGO General Insurance Co. Ltd.</p>
                  <span className="text-xs text-zinc-500 font-mono">IRDAI Reg. No. 146</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#201F1F]">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Policy Product</span>
                  <p className="text-sm font-bold text-white">Comprehensive Private Car Package</p>
                  <span className="text-xs text-zinc-500 font-mono">ID: MOT-9284-IN</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#201F1F]">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Claim Reference Token</span>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-[#C5F258] font-mono">CLM-9284-01</span>
                    <button 
                      onClick={() => navigator.clipboard.writeText('CLM-9284-01')}
                      className="text-zinc-400 hover:text-white"
                      title="Copy Claim Token"
                    >
                      <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    </button>
                  </div>
                  <span className="text-xs text-zinc-500">Assigned via IRDAI auto-allocation queue</span>
                </div>

                <div className="p-4 rounded-2xl bg-[#201F1F]">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Secure Routing Protocol</span>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#C5F258]"></span>
                    Direct IRDAI-EDI Hub
                  </p>
                  <span className="text-xs text-zinc-500">End-to-end mTLS authorization</span>
                </div>
              </div>

              {/* SHA-256 Seal */}
              <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[#DEB7FF] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold block">Dossier Integrity SHA-256 Digest</span>
                    <span className="text-xs font-mono text-zinc-300 truncate block">9941a80c2f82e185ba723d90f119c832a8ff90215b497c210d7e634</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#C5F258]/10 text-[#C5F258] text-[10px] font-bold shrink-0">
                  Immutable Seal
                </span>
              </div>

              {/* Statutory Declarations */}
              <div className="flex flex-col gap-3">
                <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 block">
                  Statutory Declarations & Consent
                </span>

                <label className="p-4 rounded-2xl bg-[#201F1F] flex items-start gap-3.5 cursor-pointer hover:bg-zinc-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={consent1}
                    onChange={(e) => setConsent1(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-[#C5F258]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white leading-relaxed block">
                      I hereby declare that the particulars provided in the FIR, Registration Certificate (RC), and repair damage bills are true and accurate to the best of my knowledge.
                    </span>
                    <span className="text-zinc-500 mt-0.5 block">Section 45 of Insurance Act, 1938 provisions applicable.</span>
                  </div>
                </label>

                <label className="p-4 rounded-2xl bg-[#201F1F] flex items-start gap-3.5 cursor-pointer hover:bg-zinc-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={consent2}
                    onChange={(e) => setConsent2(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-[#C5F258]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-white leading-relaxed block">
                      I authorize ClaimEase to transmit the encrypted dossier directly to HDFC ERGO General Insurance and the appointed IRDAI-licensed independent surveyor.
                    </span>
                    <span className="text-zinc-500 mt-0.5 block">Includes automatic sharing of verified digital workshop estimates.</span>
                  </div>
                </label>
              </div>

              {/* Bundled Assets preview */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-3 py-1.5 rounded-full bg-[#201F1F] text-zinc-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">verified</span>
                  Police GD/FIR #2940.pdf
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#201F1F] text-zinc-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">verified</span>
                  RC Smart Card (DL-10-CK-4022).pdf
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#201F1F] text-zinc-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">verified</span>
                  Authorized Workshop Estimate (₹64,200).pdf
                </span>
                <span className="px-3 py-1.5 rounded-full bg-[#201F1F] text-zinc-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">photo_camera</span>
                  4 Incident Geotagged Photos
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Post-Submission Dispatch & Final Submit (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-[#1C1B1B] rounded-3xl p-6 border border-white/[0.08] shadow-xl flex flex-col justify-between h-full gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[#DEB7FF] text-[22px]">rocket_launch</span>
                  <h3 className="text-base font-bold text-white">Post-Submission Dispatch</h3>
                </div>
                <p className="text-xs text-zinc-400 mb-6">
                  What happens immediately once you initiate authorized transmission:
                </p>

                <div className="space-y-4 relative pl-3 border-l-2 border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-white block">Immediate Carrier Acknowledgment</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Official Claim Number & IRDAI public tracking token issued within &lt;15 seconds.
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-white block">Surveyor Assignment (Under 2h)</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Assigned IRDAI-certified loss assessor will receive the pre-validated photo damage set.
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-white block">Cashless Workshop Approval</span>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Digital repair mandate dispatched to HDFC ERGO Network Garage.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#201F1F] mt-6 text-xs text-zinc-300 leading-relaxed border border-white/[0.06]">
                  <span className="text-[10px] text-[#FFB691] font-bold uppercase tracking-wider block mb-1">
                    Statutory Protection
                  </span>
                  “Under IRDAI regulations, initial virtual or physical surveyor assessment must be scheduled within <strong>48 hours</strong> of first intimation.”
                </div>
              </div>

              {/* Submit CTA */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleTriggerSubmission}
                  className="w-full py-4 px-6 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-sm shadow-[0_4px_24px_-4px_rgba(197,242,88,0.45)] transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>Submit Claim Dossier Now</span>
                </button>

                <button
                  onClick={() => setCurrentStep(3)}
                  className="w-full py-2.5 px-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
                >
                  Review Readiness Summary
                </button>

                <p className="text-center text-[10px] text-zinc-500">
                  256-Bit TLS Transmission • IRDAI Compliant Audit Log
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS SCREEN: SUBMISSION CONFIRMED & ACTIVE TRACKER (SCREEN 11)         */}
      {/* ========================================================================= */}
      {currentStep === 'success' && (
        <div className="flex flex-col gap-6">
          {/* Master Submission State Card */}
          <div className="relative overflow-hidden rounded-3xl bg-[#1C1B1B] border border-white/[0.08] p-6 md:p-8 shadow-2xl">
            <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#C5F258]/10 blur-3xl pointer-events-none" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className="flex items-center gap-2 self-start">
                  <span className="px-3 py-1 rounded-full bg-[#C5F258] text-[#151F00] text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    STEP 4 OF 4 COMPLETE
                  </span>
                  <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-semibold">
                    Motor Insurance • Comprehensive Damage
                  </span>
                </div>
                <h2 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight font-display mt-1">
                  Your claim is officially with HDFC ERGO General Insurance
                </h2>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  All statutory declarations verified. 4 pre-vetted evidentiary documents transmitted via encrypted mTLS API with zero preliminary rejections or formatting flags.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-[#C5F258] flex items-center justify-center text-[#151F00] shadow-[0_0_32px_rgba(197,242,88,0.4)]">
                  <span className="material-symbols-outlined text-[32px] font-bold">task_alt</span>
                </div>
                <div className="text-left">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">Submission Status</span>
                  <span className="text-base font-bold text-[#C5F258]">Under Surveyor Review</span>
                </div>
              </div>
            </div>

            {/* 4 Highlight Tokens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-6">
              <div className="bg-[#201F1F] rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="uppercase text-[10px] font-bold">Official Claim ID</span>
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">tag</span>
                </div>
                <span className="text-lg font-bold text-white font-mono">#CLM-9284-01</span>
                <span className="text-[11px] text-[#C5F258] mt-1 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258]"></span> Synchronized with HDFC ERGO
                </span>
              </div>

              <div className="bg-[#201F1F] rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="uppercase text-[10px] font-bold">IRDAI Reference Token</span>
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">verified</span>
                </div>
                <span className="text-xs font-bold text-white font-mono truncate">IRDA/2024/MOT/092841</span>
                <span className="text-[11px] text-zinc-400 mt-1">Regulatory ledger registered</span>
              </div>

              <div className="bg-[#201F1F] rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="uppercase text-[10px] font-bold">Estimated Coverage</span>
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">currency_rupee</span>
                </div>
                <span className="text-lg font-bold text-white font-display">₹48,500</span>
                <span className="text-[11px] text-[#C5F258] mt-1 font-medium">Zero Deductible • Direct Cashless</span>
              </div>

              <div className="bg-[#201F1F] rounded-2xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="uppercase text-[10px] font-bold">Settlement ETA</span>
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">bolt</span>
                </div>
                <span className="text-lg font-bold text-white font-display">3 Business Days</span>
                <span className="text-[11px] text-[#FFB691] mt-1 font-medium">Speed Guarantee Active</span>
              </div>
            </div>
          </div>

          {/* Next Scheduled Milestone & Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 7 cols: Physical Inspection & Cryptographic Audit Trail */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {/* Inspection Milestone Card */}
              <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#FFB691]/20 text-[#FFB691] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[22px]">car_crash</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block">Next Scheduled Milestone</span>
                      <h3 className="text-base font-bold text-white">Digital Vehicle Physical Inspection</h3>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#FF823A]/15 text-[#FF823A] text-xs font-semibold">
                    Surge Priority Pass
                  </span>
                </div>

                {/* Appointment Box */}
                <div className="p-4 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col gap-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b border-white/[0.06]">
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">Time Slot Confirmed</span>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#C5F258] text-[20px]">calendar_today</span>
                        <span className="text-sm font-bold text-white">Today, 2:30 PM – 3:00 PM</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-1">IRDAI Certified Surveyor</span>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#DEB7FF] text-[20px]">badge</span>
                        <div>
                          <span className="text-sm font-bold text-white block">Rajesh Nair</span>
                          <span className="text-[11px] text-zinc-400">License #88421 • 4.9★ (380+ claims)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href="tel:+919820011223"
                      className="px-4 py-2 rounded-full bg-[#C5F258] text-[#151F00] font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">call</span>
                      <span>Call Surveyor</span>
                    </a>
                    <button
                      onClick={() => alert('Live location pinned and dispatched to Surveyor Rajesh Nair.')}
                      className="px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#C5F258]">share_location</span>
                      <span>Share Live Location</span>
                    </button>
                    <button
                      onClick={() => alert('Surveyor window rescheduled to 4:30 PM today.')}
                      className="px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold ml-auto"
                    >
                      Reschedule Window
                    </button>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-white block">Surveyor Arrival Preparation Checklist:</span>
                  <div className="p-3 rounded-xl bg-[#201F1F] flex items-start gap-2.5 text-xs text-zinc-300">
                    <span className="material-symbols-outlined text-[#C5F258] text-[18px] shrink-0 mt-0.5">check_circle</span>
                    <span>Keep original physical <strong>Driving Licence (DL)</strong> and <strong>Vehicle Registration Certificate (RC)</strong> handy for verification.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#201F1F] flex items-start gap-2.5 text-xs text-zinc-300">
                    <span className="material-symbols-outlined text-[#C5F258] text-[18px] shrink-0 mt-0.5">check_circle</span>
                    <span>Keep your vehicle parked in an open space with clear natural light for high-resolution impact angle capture.</span>
                  </div>
                </div>
              </div>

              {/* Cryptographic Audit Trail */}
              <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Cryptographic Audit Trail</h3>
                    <span className="text-[11px] text-zinc-400">Immutable proof of transmission & IRDAI compliance</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-white/10 font-mono text-[10px] text-[#C5F258]">
                    SHA-256 SEALED
                  </span>
                </div>

                <div className="space-y-3 pt-1 pl-4 border-l-2 border-zinc-800">
                  <div className="p-3 rounded-xl bg-[#201F1F]">
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span>Insurer Gateway Handshake: 200 OK</span>
                      <span className="font-mono text-[#C5F258] text-[11px]">10:48:12 AM</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Encrypted payload pushed to HDFC ERGO Core Claims API via mutual TLS (mTLS).
                    </p>
                    <span className="text-[10px] font-mono text-zinc-500 break-all block mt-1">
                      Payload SHA-256: 9941a80c2f82e185ba723d90f119c832a8ff90215b497c210d7e6348ef1
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#201F1F]">
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span>Statutory Declarations Signed</span>
                      <span className="font-mono text-zinc-400 text-[11px]">10:48:05 AM</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Section 45 of Insurance Act, 1938 compliance digitally sealed via Aadhaar OTP eSign token #E-99214.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => alert('Downloaded official submission receipt PDF with government QR verification tag.')}
                  className="w-full py-2.5 px-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">download</span>
                  <span>Download Official Submission Receipt (PDF)</span>
                </button>
              </div>
            </div>

            {/* Right 5 cols: AI Coach & Garage Pass */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Inspection Intelligence Coach */}
              <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-[#DEB7FF]/30 shadow-xl flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#DEB7FF]/10 rounded-full blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#DEB7FF] text-[20px]">smart_toy</span>
                    <h3 className="text-base font-bold text-white">Inspection Intelligence</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#632D93]/40 text-[#DEB7FF] text-[10px] font-bold">
                    Live Coach
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#201F1F] text-xs text-zinc-300 leading-relaxed border border-[#DEB7FF]/20">
                  <span className="text-[10px] text-[#DEB7FF] font-bold uppercase tracking-wider block mb-1">
                    Surveyor Profile Insights
                  </span>
                  Rajesh Nair has inspected <strong>420+ Creta collision claims</strong>. He will scrutinize the front-right bumper structural mounting brackets. Because your quote from Apex Autoworks already includes itemized OEM part numbers, ClaimEase has pre-authorized the estimate with 96% accuracy.
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Recommended Questions:
                  </span>
                  <button
                    onClick={() => onNavigate('ai-claim-pilot')}
                    className="w-full text-left p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center justify-between"
                  >
                    <span>"What specific questions will Rajesh Nair ask?"</span>
                    <span className="material-symbols-outlined text-[15px] text-[#DEB7FF]">arrow_forward</span>
                  </button>
                  <button
                    onClick={() => onNavigate('ai-claim-pilot')}
                    className="w-full text-left p-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-xs text-zinc-200 flex items-center justify-between"
                  >
                    <span>"Can I get bumper replaced instead of repaired?"</span>
                    <span className="material-symbols-outlined text-[15px] text-[#DEB7FF]">arrow_forward</span>
                  </button>
                </div>

                <button
                  onClick={() => onNavigate('ai-claim-pilot')}
                  className="w-full py-3 rounded-full bg-[#DEB7FF] hover:bg-[#d09fff] text-[#2D0050] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  <span>Open AI Claim Pilot Chat</span>
                </button>
              </div>

              {/* Cashless Garage Pass */}
              <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C5F258] text-[20px]">garage</span>
                    <h3 className="text-base font-bold text-white">Apex Multi-Brand Autoworks</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                    Cashless
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#201F1F] text-xs space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Proximity</span>
                    <span className="text-white font-bold">4.2 km away (Andheri East)</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Work Authorization</span>
                    <span className="text-[#FFB691] font-semibold">Surveyor Sign-off Pending</span>
                  </div>
                </div>

                <button
                  onClick={() => alert('Digital workshop pass sent via SMS to Apex Autoworks.')}
                  className="w-full py-2.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#C5F258]">send_to_mobile</span>
                  <span>Send Claim Pass to Workshop</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission Simulation Overlay */}
      {showTransmitOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#1C1B1B] border border-white/10 rounded-3xl p-8 max-w-md w-full text-center flex flex-col items-center gap-4 shadow-2xl">
            {isTransmitting ? (
              <>
                <div className="w-16 h-16 rounded-full bg-[#C5F258]/20 flex items-center justify-center text-[#C5F258]">
                  <span className="material-symbols-outlined text-[32px] animate-spin">sync</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white font-display">Transmitting to HDFC ERGO</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Signing SHA-256 payload & registering claim dossier in IRDAI registry...
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-[#C5F258] text-[#151F00] flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-[32px] font-bold">check</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white font-display">Claim Dossier Dispatched!</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Official Claim Ref: <strong className="text-[#C5F258]">CLM-9284-01</strong>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
