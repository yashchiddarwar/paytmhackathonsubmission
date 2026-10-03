import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, ChatMessage, ClaimDocument } from '../types';
import { MOCK_DOCUMENTS } from '../data/mockData';
import { sendClaimChatMessage, convertIncidentToJourney, synthesizeTTS, fetchPolicies } from '../services/api';
import { DBClaim } from '../../server/db';
import { AudioRecordingService } from '../utils/audioRecorder';

interface AiClaimPilotScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectDocument?: (doc: ClaimDocument) => void;
  onResumeClaim: () => void;
  onClaimCreated?: (newClaim: DBClaim) => void;
  activeClaim?: DBClaim | null;
}

export const AiClaimPilotScreen: React.FC<AiClaimPilotScreenProps> = ({
  onNavigate,
  onSelectDocument,
  onResumeClaim,
  onClaimCreated,
  activeClaim
}) => {
  // Navigation mode: Chat Copilot vs Claim Initiation Deck
  const [activeMode, setActiveMode] = useState<'chat' | 'initiate'>(
    activeClaim ? 'chat' : 'chat'
  );
  const [incidentText, setIncidentText] = useState('');
  
  // Policies from Database
  const [policies, setPolicies] = useState<any[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // Context Selection Mode: 'no_context' | 'policy' | 'claim'
  const [contextMode, setContextMode] = useState<'no_context' | 'policy' | 'claim'>(
    activeClaim ? 'claim' : 'no_context'
  );
  const [selectedPolicyNumber, setSelectedPolicyNumber] = useState<string>('none');
  const [selectedInitiationPolicy, setSelectedInitiationPolicy] = useState<string>('none');

  // Load Policies from API on mount
  useEffect(() => {
    let isMounted = true;
    const loadPoliciesData = async () => {
      setLoadingPolicies(true);
      try {
        const fetched = await fetchPolicies();
        if (isMounted && fetched && fetched.length > 0) {
          setPolicies(fetched);
          if (activeClaim && activeClaim.policyNumber) {
            setSelectedPolicyNumber(activeClaim.policyNumber);
            setSelectedInitiationPolicy(activeClaim.policyNumber);
          } else {
            setSelectedPolicyNumber(fetched[0].policyNumber);
            setSelectedInitiationPolicy('none');
          }
        }
      } catch (err) {
        console.warn('Could not fetch policies:', err);
      } finally {
        if (isMounted) setLoadingPolicies(false);
      }
    };
    loadPoliciesData();
    return () => { isMounted = false; };
  }, [activeClaim]);

  // Sync context mode when activeClaim changes
  useEffect(() => {
    if (activeClaim) {
      setContextMode('claim');
    }
  }, [activeClaim]);

  // Current active policy object
  const activePolicyObj = policies.find(p => p.policyNumber === selectedPolicyNumber) || policies[0];

  // Build welcome message for current context
  const getInitialMessage = (mode: 'no_context' | 'policy' | 'claim'): ChatMessage => {
    if (mode === 'claim' && activeClaim) {
      return {
        id: 'welcome-claim',
        sender: 'assistant',
        timestamp: 'Just now',
        text: `Hello! I'm your **AI Claim Pilot**, actively monitoring your claim **${activeClaim.claimNumber}** (${activeClaim.vehicle}).\n\n• **Current Stage**: Step ${activeClaim.currentStep || 2} — ${activeClaim.status.replace('_', ' ').toUpperCase()}\n• **Insurer**: ${activeClaim.insurer}\n• **Damages**: ${activeClaim.damages?.join(', ') || 'Under assessment'}\n\nAsk any question about your repair estimate, required documents, or surveyor sign-off.`,
        groundingContext: {
          title: "Claim Telemetry Grounding",
          details: `Grounded in active claim ${activeClaim.claimNumber} with ${activeClaim.insurer}.`,
          claimId: activeClaim.claimNumber,
          stepNumber: activeClaim.currentStep || 2
        },
        suggestedQueries: [
          "What documents are still pending for my claim?",
          "How does zero-depreciation apply to my bumper and paint?",
          "What are the next steps during surveyor inspection?"
        ]
      };
    } else if (mode === 'policy' && activePolicyObj) {
      const vInfo = activePolicyObj.vehicle?.makeModel ? ` for ${activePolicyObj.vehicle.makeModel}` : '';
      return {
        id: 'welcome-policy',
        sender: 'assistant',
        timestamp: 'Just now',
        text: `Hello! I am your **AI Claim Pilot**, grounded in your active policy **${activePolicyObj.policyNumber}** (${activePolicyObj.productName}${vInfo}) with **${activePolicyObj.carrier}**.\n\n• **Coverage Tier**: ${activePolicyObj.coverageTier}\n• **Compulsory Deductible**: ${activePolicyObj.deductible}\n• **Zero Depreciation Endorsement**: ${activePolicyObj.hasZeroDep ? 'Active (100% parts covered)' : 'Standard Tariff'}\n\nAsk me about coverage entitlements, deductible clauses, or how to file a claim under this policy.`,
        groundingContext: {
          title: "Policy Specification Grounding",
          details: `Grounded in statutory policy schedule ${activePolicyObj.policyNumber} (${activePolicyObj.carrier}).`,
          claimId: activePolicyObj.policyNumber,
          stepNumber: 1
        },
        suggestedQueries: [
          `What is covered under my ${activePolicyObj.coverageTier} package?`,
          "What is the procedure for cashless repairs under this policy?",
          "What are the mandatory documents to initiate a claim?"
        ]
      };
    } else {
      return {
        id: 'welcome-general',
        sender: 'assistant',
        timestamp: 'Just now',
        text: `Welcome to **ClaimEase AI Claim Pilot**! You are currently in **General Insurance Mode** (No specific policy or claim linked).\n\nI can answer any questions regarding:\n• **Motor Claims**: Accident documentation, FIR vs General Diary (GD) rules, zero-depreciation benefits.\n• **Health Claims**: 1-hour cashless pre-authorization SLAs, room rent capping, reimbursement checklists.\n• **IRDAI Rights**: Protection of Policyholders' Interests (2024), 30-day settlement SLAs, and Insurance Ombudsman escalation.\n\nYou can ask any question freely, or switch to an active policy using the context selector above!`,
        groundingContext: {
          title: "IRDAI Statutory Knowledge Grounding",
          details: "Grounded in IRDAI General Insurance Regulations and Indian Motor Tariff Guidelines.",
          stepNumber: 1
        },
        suggestedQueries: [
          "When is a Police FIR mandatory vs when is a GD entry enough?",
          "What documents are required for an own-damage car claim?",
          "How does cashless hospital pre-authorization work?",
          "Can an insurer reject my claim if delay occurred?"
        ]
      };
    }
  };

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([getInitialMessage(contextMode)]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Switch context handler
  const handleSwitchContext = (newMode: 'no_context' | 'policy' | 'claim', policyNum?: string) => {
    setContextMode(newMode);
    if (policyNum) {
      setSelectedPolicyNumber(policyNum);
    }
    const welcome = getInitialMessage(newMode);
    setMessages([welcome]);
  };

  // Audio Recording & Dictation States
  const [isRecordingIncident, setIsRecordingIncident] = useState(false);
  const [recordingSecondsIncident, setRecordingSecondsIncident] = useState(0);
  const [isTranscribingIncident, setIsTranscribingIncident] = useState(false);
  const [incidentMicError, setIncidentMicError] = useState<string | null>(null);

  const [isRecordingChat, setIsRecordingChat] = useState(false);
  const [recordingSecondsChat, setRecordingSecondsChat] = useState(0);
  const [isTranscribingChat, setIsTranscribingChat] = useState(false);
  const [chatMicError, setChatMicError] = useState<string | null>(null);

  const [isConvertingIncident, setIsConvertingIncident] = useState(false);
  const [conversionResult, setConversionResult] = useState<any>(null);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayTTS = async (msgId: string, text: string) => {
    try {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (playingMsgId === msgId) {
        setPlayingMsgId(null);
        return;
      }
      setPlayingMsgId(msgId);
      const cleanText = text.replace(/[*_#`[\]()]/g, ' ').replace(/\n+/g, '. ').slice(0, 400);
      const audioBlob = await synthesizeTTS(cleanText);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      audio.onended = () => {
        setPlayingMsgId(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setPlayingMsgId(null);
      };
      audio.play();
    } catch (err) {
      console.warn('TTS playback error in AiClaimPilotScreen:', err);
      setPlayingMsgId(null);
    }
  };

  // Active claim documents
  const firDoc = activeClaim?.documents?.find(d => d.id === 'doc-fir') || MOCK_DOCUMENTS.find(d => d.id === 'doc-fir') || MOCK_DOCUMENTS[0];
  const pendingDocInFocus = activeClaim?.documents?.find(d => !d.verified && d.status !== 'verified') || activeClaim?.documents?.[0] || firDoc;

  const audioIncidentRecorder = useRef<AudioRecordingService>(new AudioRecordingService());
  const audioChatRecorder = useRef<AudioRecordingService>(new AudioRecordingService());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioIncidentRecorder.current.cancel();
      audioChatRecorder.current.cancel();
    };
  }, []);

  const simulationTimerRef = useRef<any>(null);

  // Simulated Voice Dictation
  const simulateVoiceDictation = (text: string) => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setIsRecordingIncident(true);
    setRecordingSecondsIncident(1);
    setIncidentMicError(null);
    setIncidentText('');

    const words = text.split(' ');
    let currentIdx = 0;
    simulationTimerRef.current = setInterval(() => {
      currentIdx += 2;
      setRecordingSecondsIncident(prev => prev + 1);
      const partial = words.slice(0, currentIdx).join(' ');
      setIncidentText(partial);

      if (currentIdx >= words.length) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
        setIncidentText(text);
        setIsRecordingIncident(false);
      }
    }, 110);
  };

  // Incident Dictation Toggle
  const toggleIncidentDictation = async () => {
    if (simulationTimerRef.current) {
      clearInterval(simulationTimerRef.current);
      simulationTimerRef.current = null;
      setIsRecordingIncident(false);
      return;
    }

    if (isRecordingIncident) {
      setIsRecordingIncident(false);
      setIsTranscribingIncident(true);
      setIncidentMicError(null);
      try {
        const transcript = await audioIncidentRecorder.current.stopAndTranscribe();
        if (transcript && transcript.trim()) {
          const cleanText = transcript.trim();
          setIncidentText(prev => {
            if (!prev || !prev.trim()) return cleanText;
            if (prev.includes(cleanText)) return prev;
            if (cleanText.includes(prev.trim())) return cleanText;
            return `${prev.trim()} ${cleanText}`;
          });
        } else {
          setIncidentMicError('No speech detected. Please speak clearly into your microphone.');
        }
      } catch (err: any) {
        console.warn('Incident transcription warning:', err);
        setIncidentMicError(err.message || 'Voice capture error.');
      } finally {
        setIsTranscribingIncident(false);
      }
    } else {
      setIncidentMicError(null);
      try {
        await audioIncidentRecorder.current.startRecording(
          (sec) => setRecordingSecondsIncident(sec),
          (liveText) => {
            if (liveText && liveText.trim()) setIncidentText(liveText);
          }
        );
        setIsRecordingIncident(true);
      } catch (err: any) {
        console.warn('Microphone stream error:', err);
        setIncidentMicError('Microphone permission denied or not available.');
      }
    }
  };

  // Chat Dictation Toggle
  const toggleChatDictation = async () => {
    if (isRecordingChat) {
      setIsRecordingChat(false);
      setIsTranscribingChat(true);
      setChatMicError(null);
      try {
        const transcript = await audioChatRecorder.current.stopAndTranscribe();
        if (transcript && transcript.trim()) {
          const cleanText = transcript.trim();
          setInputText(prev => {
            if (!prev || !prev.trim()) return cleanText;
            if (prev.includes(cleanText)) return prev;
            if (cleanText.includes(prev.trim())) return cleanText;
            return `${prev.trim()} ${cleanText}`;
          });
        }
      } catch (err: any) {
        setChatMicError(err.message || 'Could not transcribe speech.');
      } finally {
        setIsTranscribingChat(false);
      }
    } else {
      setChatMicError(null);
      try {
        await audioChatRecorder.current.startRecording(
          (sec) => setRecordingSecondsChat(sec),
          (liveText) => {
            if (liveText && liveText.trim()) setInputText(liveText);
          }
        );
        setIsRecordingChat(true);
      } catch (err: any) {
        console.warn('Chat mic access error:', err);
        setChatMicError('Microphone permission denied or not available.');
      }
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const q = (textToSend || inputText).trim();
    if (!q || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: q
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    const reqClaimId = contextMode === 'claim' ? activeClaim?.claimNumber : undefined;
    const reqPolicyNum = contextMode === 'policy' && selectedPolicyNumber !== 'none' ? selectedPolicyNumber : undefined;
    const isNoContext = contextMode === 'no_context' || (!reqClaimId && !reqPolicyNum);

    try {
      const response = await sendClaimChatMessage({
        message: q,
        claimId: reqClaimId,
        policyNumber: reqPolicyNum,
        noContext: isNoContext,
        currentStep: activeClaim?.currentStep || 2
      });

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.text,
        groundingContext: response.groundingContext,
        suggestedQueries: response.suggestedQueries
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      // Dynamic fallback
      const qLower = q.toLowerCase();
      let fallbackText = '';
      let groundingDetails = '';
      let suggested: string[] = [];

      if (qLower.includes('fir') || qLower.includes('police') || qLower.includes('gd')) {
        fallbackText = `### ⚖️ Police Documentation Guidelines\n\n• **Single-Vehicle Self-Damage**: An FIR is **not legally mandatory** if there is no third-party injury or property casualty.\n• **Third-Party Liability**: A Police Station General Diary (GD) entry or e-FIR under Section 154 CrPC is required.\n• Insurers cannot reject a genuine claim solely for lack of an FIR if an authorized surveyor verifies the physical impact.`;
        groundingDetails = 'Indian Motor Tariff Section 154 & IRDAI Guidelines.';
        suggested = ['How do I get an online GD entry?', 'What if the surveyor asks for an FIR?'];
      } else if (qLower.includes('zero dep') || qLower.includes('depreciation') || qLower.includes('bumper')) {
        fallbackText = `### 🛡️ Zero-Depreciation Protection (GR-33)\n\nUnder standard motor rules, insurers deduct 50% depreciation on plastic/rubber bumpers and 30% on fiberglass.\nWith your **Zero-Depreciation** add-on, 100% of replacement parts are covered by the insurer, leaving only the statutory compulsory deductible (₹1,000).`;
        groundingDetails = 'Indian Motor Tariff General Regulation GR-33.';
        suggested = ['What is the compulsory deductible?', 'Does zero dep cover consumables?'];
      } else if (contextMode === 'claim' && activeClaim) {
        fallbackText = `### 📋 Active Claim Assessment (${activeClaim.claimNumber})\n\nYour claim for the **${activeClaim.vehicle}** is currently at **Step ${activeClaim.currentStep || 2}** with ${activeClaim.insurer}.\nRegistered damages: ${activeClaim.damages?.join(', ') || 'Front Bumper Assembly'}.\nEnsure all replacement items in the workshop estimate correspond with physical impact points before surveyor final sign-off.`;
        groundingDetails = `Grounded in active claim ${activeClaim.claimNumber}.`;
        suggested = ['What documents are still pending?', 'When will surveyor inspection happen?'];
      } else if (contextMode === 'policy' && activePolicyObj) {
        fallbackText = `### 🛡️ Policy Assessment (${activePolicyObj.policyNumber})\n\nUnder your **${activePolicyObj.productName}** with **${activePolicyObj.carrier}** (${activePolicyObj.coverageTier}), zero depreciation is ${activePolicyObj.hasZeroDep ? 'active' : 'standard'}. Standard compulsory deductible: ${activePolicyObj.deductible}.`;
        groundingDetails = `Grounded in policy ${activePolicyObj.policyNumber}.`;
        suggested = ['How do I initiate a cashless claim?', 'What are the mandatory documents?'];
      } else {
        fallbackText = `### 🌐 IRDAI Regulatory Guidance\n\nUnder IRDAI regulations, claim settlement relies on timely incident intimation, proof of insurable interest, and certified repair or hospital bills.\n• Insurers must settle or repudiate claims within 30 days of receiving the surveyor report.\n• Claims cannot be rejected solely for delay if the delay was due to genuine unavoidable circumstances.`;
        groundingDetails = "IRDAI Protection of Policyholders' Interests Regulations 2024.";
        suggested = ['What documents are mandatory for accident claims?', 'When is a Police FIR required?'];
      }

      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: fallbackText,
        groundingContext: {
          title: "ClaimEase Regulatory Grounding",
          details: groundingDetails,
          claimId: reqClaimId || reqPolicyNum,
          stepNumber: 2
        },
        suggestedQueries: suggested
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Launch claim journey from Initiation Deck
  const handleLaunchClaimJourney = async () => {
    if (!incidentText.trim() || isConvertingIncident) return;
    setIsConvertingIncident(true);

    try {
      const polParam = selectedInitiationPolicy !== 'none' ? selectedInitiationPolicy : undefined;
      const result = await convertIncidentToJourney(incidentText, polParam);
      setConversionResult(result);
      if (result.success && result.claim) {
        onClaimCreated?.(result.claim);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to convert incident. Please check details.');
    } finally {
      setIsConvertingIncident(false);
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto gap-6 pb-12 animate-fade-in">
      {/* Top Breadcrumb & Status Ribbon with Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <span className="material-symbols-outlined text-[16px] text-[#DEB7FF]">psychology</span>
            <span>AI Claim Pilot</span>
          </span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-white font-semibold">
            {activeMode === 'chat'
              ? (contextMode === 'claim' && activeClaim
                  ? `In-Claim Mode (${activeClaim.claimNumber})`
                  : contextMode === 'policy' && activePolicyObj
                  ? `Policy Mode (${activePolicyObj.carrier})`
                  : 'General IRDAI Copilot Mode')
              : 'Claim Initiation Deck (Voice & Text)'}
          </span>
        </div>

        {/* Mode Toggle Pills & Live Engine indicator */}
        <div className="flex items-center gap-3">
          <div className="bg-[#1C1B1B] p-1 rounded-full border border-white/[0.08] flex items-center gap-1">
            <button
              onClick={() => setActiveMode('chat')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeMode === 'chat'
                  ? 'bg-[#DEB7FF] text-[#2D0050]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">chat</span>
              <span>AI Claim Pilot Chat</span>
            </button>
            <button
              onClick={() => setActiveMode('initiate')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeMode === 'initiate'
                  ? 'bg-[#C5F258] text-[#151F00]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">mic</span>
              <span>Initiation Deck (Voice & Text)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#1C1B1B] px-3.5 py-1.5 rounded-full border border-white/[0.08]">
            <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-pulse"></span>
            <span className="text-xs text-white font-medium">AI Pilot v2.4</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-[#DEB7FF] font-semibold">IRDAI Grounded</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: CHAT COPILOT WITH MULTI-CONTEXT SWITCHER                          */}
      {/* ========================================================================= */}
      {activeMode === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1: Conversation & Grounded Thread (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {/* Context Selector Bar */}
            <div className="p-3 rounded-2xl bg-[#181818] border border-white/[0.08] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#DEB7FF]">tune</span>
                  <span>Active Adjudication Context:</span>
                </span>
                <span className="text-[11px] text-zinc-500">Click to switch context</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Option 1: General / No Context */}
                <button
                  type="button"
                  onClick={() => handleSwitchContext('no_context')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    contextMode === 'no_context'
                      ? 'bg-[#632D93] text-[#DEB7FF] border border-[#DEB7FF]/40 shadow-sm'
                      : 'bg-[#222] text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  <span>🌐</span>
                  <span>General Guidance (No Policy)</span>
                </button>

                {/* Option 2: Active Claim (if exists) */}
                {activeClaim && (
                  <button
                    type="button"
                    onClick={() => handleSwitchContext('claim')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      contextMode === 'claim'
                        ? 'bg-[#C5F258] text-[#151F00] font-bold shadow-sm'
                        : 'bg-[#222] text-zinc-400 hover:text-white border border-white/5'
                    }`}
                  >
                    <span>📋</span>
                    <span>Claim: {activeClaim.claimNumber}</span>
                  </button>
                )}

                {/* Option 3: Policies from DB */}
                {policies.map((p) => {
                  const isSelected = contextMode === 'policy' && selectedPolicyNumber === p.policyNumber;
                  const label = p.carrier.includes('HDFC') ? 'HDFC ERGO Motor' : (p.carrier.includes('Care') ? 'Care Health' : p.productName);
                  return (
                    <button
                      key={p.id || p.policyNumber}
                      type="button"
                      onClick={() => handleSwitchContext('policy', p.policyNumber)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#DEB7FF] text-[#2D0050] font-bold shadow-sm'
                          : 'bg-[#222] text-zinc-400 hover:text-white border border-white/5'
                      }`}
                    >
                      <span>🛡️</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Status Context Banner */}
              <div className="pt-1 text-[11px] text-zinc-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C5F258] shrink-0" />
                <span>
                  {contextMode === 'claim' && activeClaim
                    ? `Telemetry Active: Claim ${activeClaim.claimNumber} • ${activeClaim.vehicle} (${activeClaim.insurer})`
                    : contextMode === 'policy' && activePolicyObj
                    ? `Policy Grounded: ${activePolicyObj.productName} • ${activePolicyObj.carrier} (${activePolicyObj.policyNumber})`
                    : 'Universal Regulatory Mode: IRDAI Master Circulars & Consumer Protection Rules'}
                </span>
              </div>
            </div>

            {/* Messages Thread Container */}
            <div className="space-y-4">
              {messages.map((msg) => (
                <React.Fragment key={msg.id}>
                  {msg.sender === 'user' ? (
                    /* User Bubble */
                    <div className="bg-[#1C1B1B] p-5 rounded-2xl border border-white/[0.08] flex gap-4 shadow-sm">
                      <div className="w-9 h-9 rounded-full bg-[#632D93] border border-[#DEB7FF]/30 flex items-center justify-center text-[#DEB7FF] text-xs font-bold shrink-0">
                        YK
                      </div>
                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">You</span>
                          <span className="text-[11px] text-zinc-500">{msg.timestamp}</span>
                        </div>
                        <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                          {msg.text}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Assistant Bubble with Grounding Card */
                    <div className="bg-[#201F1F] p-6 rounded-2xl border border-[#DEB7FF]/20 shadow-xl flex flex-col gap-4 relative overflow-hidden">
                      <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-[#632D93]/20 blur-3xl pointer-events-none" />

                      {/* Header */}
                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#632D93]/40 border border-[#DEB7FF]/40 flex items-center justify-center text-[#DEB7FF]">
                            <span className="material-symbols-outlined text-[19px]">auto_awesome</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">AI Claim Pilot</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#632D93]/50 text-[#DEB7FF] text-[10px] font-semibold">
                              {contextMode === 'claim' ? 'Claim Mode v2.4' : contextMode === 'policy' ? 'Policy Mode v2.4' : 'General Mode v2.4'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-400">
                          <button
                            onClick={() => handlePlayTTS(msg.id, msg.text)}
                            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-all ${
                              playingMsgId === msg.id 
                                ? 'bg-[#C5F258] text-black font-bold' 
                                : 'text-[#C5F258] hover:bg-white/5'
                            }`}
                            title="Listen to local AI voice"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              {playingMsgId === msg.id ? 'stop' : 'volume_up'}
                            </span>
                            <span>{playingMsgId === msg.id ? 'Playing' : 'Listen'}</span>
                          </button>
                          <button 
                            onClick={() => navigator.clipboard.writeText(msg.text)}
                            className="p-1 rounded hover:text-white hover:bg-white/5 transition-colors" 
                            title="Copy response"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>
                        </div>
                      </div>

                      {/* Evaluated Under Pill */}
                      <div className="p-3 rounded-xl bg-[#2A2A2A] border border-white/[0.06] text-xs text-white flex items-center gap-2 z-10">
                        <span className="material-symbols-outlined text-[#C5F258] text-[18px]">verified</span>
                        <span>Evaluating within: <strong className="text-[#C5F258]">
                          {contextMode === 'claim' && activeClaim
                            ? `${activeClaim.policyType} (${activeClaim.claimNumber})`
                            : contextMode === 'policy' && activePolicyObj
                            ? `${activePolicyObj.carrier} • ${activePolicyObj.coverageTier}`
                            : 'IRDAI Statutory Insurance Regulations (General Consumer Mode)'}
                        </strong></span>
                      </div>

                      {/* Structured Response Text */}
                      <div className="text-sm text-zinc-200 leading-relaxed space-y-3 z-10 whitespace-pre-line">
                        {msg.text}
                      </div>

                      {/* Grounding Proof Box */}
                      {msg.groundingContext && (
                        <div className="mt-1 p-4 rounded-xl bg-[#632D93]/20 border border-[#DEB7FF]/30 flex flex-col gap-2 relative z-10">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#DEB7FF] text-xs font-bold tracking-wider uppercase">
                              <span className="material-symbols-outlined text-[16px]">psychology</span>
                              <span>{msg.groundingContext.title}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#632D93] text-[#DEB7FF]">
                              Grounded
                            </span>
                          </div>
                          <p className="text-xs text-zinc-200 leading-relaxed">
                            {msg.groundingContext.details}
                          </p>
                        </div>
                      )}

                      {/* Suggested Next Queries */}
                      {msg.suggestedQueries && msg.suggestedQueries.length > 0 && (
                        <div className="pt-2 flex flex-col gap-2 z-10">
                          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                            Suggested Next Queries:
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {msg.suggestedQueries.map((queryText, qIdx) => (
                              <button
                                key={qIdx}
                                onClick={() => handleSendMessage(queryText)}
                                className="px-3.5 py-1.5 rounded-full bg-[#1C1B1B] hover:bg-zinc-800 border border-white/10 hover:border-[#DEB7FF]/50 text-xs text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 text-left"
                              >
                                <span>{queryText}</span>
                                <span className="material-symbols-outlined text-[14px] text-[#DEB7FF]">arrow_forward</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}

              {isTyping && (
                <div className="p-4 rounded-2xl bg-[#201F1F] border border-white/10 flex items-center gap-3 text-xs text-zinc-400 animate-pulse">
                  <span className="material-symbols-outlined text-[18px] text-[#DEB7FF] animate-spin">sync</span>
                  <span>AI Claim Pilot is evaluating statutory IRDAI mandates...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="mt-2 bg-[#1C1B1B] p-2.5 rounded-2xl border border-white/[0.12] focus-within:border-[#DEB7FF]/60 focus-within:shadow-[0_0_24px_-4px_rgba(222,183,255,0.25)] transition-all flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 pt-1 text-[11px] text-zinc-400">
                <span className={`w-1.5 h-1.5 rounded-full ${contextMode === 'claim' ? 'bg-[#C5F258]' : contextMode === 'policy' ? 'bg-[#DEB7FF]' : 'bg-zinc-400'}`}></span>
                <span>Context: {contextMode === 'claim' && activeClaim ? `Claim ${activeClaim.claimNumber} • Step ${activeClaim.currentStep || 2}` : contextMode === 'policy' && activePolicyObj ? `Policy ${activePolicyObj.policyNumber}` : 'General Consumer Guidance (No Policy)'}</span>
              </div>
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => onNavigate('check-document')}
                  className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors shrink-0"
                  title="Attach document photo"
                >
                  <span className="material-symbols-outlined text-[18px]">add_a_photo</span>
                </button>
                <button
                  type="button"
                  onClick={toggleChatDictation}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isRecordingChat
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                  }`}
                  title={isRecordingChat ? 'Stop recording & transcribe' : 'Dictate voice query'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isRecordingChat ? 'stop' : 'mic'}
                  </span>
                </button>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isRecordingChat
                      ? `Recording audio... 00:${recordingSecondsChat < 10 ? `0${recordingSecondsChat}` : recordingSecondsChat}`
                      : isTranscribingChat
                      ? 'Transcribing your voice...'
                      : contextMode === 'claim' && activeClaim
                      ? `Ask about claim ${activeClaim.claimNumber}...`
                      : contextMode === 'policy' && activePolicyObj
                      ? `Ask about policy ${activePolicyObj.policyNumber}...`
                      : 'Ask about filing a claim, IRDAI rules, FIR requirements, or estimates...'
                  }
                  className="bg-transparent text-white placeholder-zinc-500 text-xs md:text-sm w-full outline-none px-2"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isTyping}
                  className="px-5 py-2.5 rounded-full bg-[#DEB7FF] hover:bg-[#d09fff] disabled:opacity-50 text-[#2D0050] font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
                >
                  <span>Send</span>
                  <span className="material-symbols-outlined text-[16px]">send</span>
                </button>
              </form>
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-2">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-[#C5F258]">lock</span>
                Grounded on IRDAI statutory regulations & claims jurisprudence
              </span>
              <span>ClaimEase Pilot 2.4</span>
            </div>
          </div>

          {/* COLUMN 2: Context-Aware Intelligence Sidebar (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 rounded-3xl bg-[#141414] border border-white/[0.08] flex flex-col gap-4 shadow-xl">
              
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#C5F258] text-[20px]">
                    {contextMode === 'claim' ? 'hub' : contextMode === 'policy' ? 'shield' : 'auto_awesome'}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {contextMode === 'claim' ? 'Active Claim Telemetry' : contextMode === 'policy' ? 'Linked Policy Context' : 'IRDAI Knowledge Hub'}
                  </span>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1B1B] border border-[#C5F258]/30 text-[#C5F258] text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258] animate-pulse"></span>
                  {contextMode === 'claim' ? 'In-Claim Sync' : contextMode === 'policy' ? 'Policy Active' : 'General Mode'}
                </span>
              </div>

              {/* VIEW A: IF IN CLAIM MODE AND ACTIVE CLAIM EXISTS */}
              {contextMode === 'claim' && activeClaim && (
                <>
                  <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Claim Information</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                        Step {activeClaim.currentStep || 2} of 4
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Claim Number</span>
                        <span className="text-white font-bold">{activeClaim.claimNumber}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Vehicle / Asset</span>
                        <span className="text-white font-bold truncate block">{activeClaim.vehicle}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Insurer</span>
                        <span className="text-zinc-300 truncate block">{activeClaim.insurer}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Policy Ref</span>
                        <span className="text-zinc-300 font-mono truncate block">{activeClaim.policyNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Document Focus Card */}
                  <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#DEB7FF] text-[18px]">assignment</span>
                        <span className="text-xs font-bold text-white">Document in Focus</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        pendingDocInFocus.verified ? 'bg-[#C5F258]/20 text-[#C5F258]' : 'bg-[#FF823A]/15 text-[#FF823A]'
                      }`}>
                        {pendingDocInFocus.verified ? 'Verified' : 'Action Required'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#252424]">
                      <div>
                        <h5 className="text-xs font-bold text-white">{pendingDocInFocus.name}</h5>
                        <span className="text-[11px] text-zinc-400">{pendingDocInFocus.code}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[#C5F258]">
                        {pendingDocInFocus.readiness || 'Pending'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {pendingDocInFocus.description || 'Statutory requirement for surveyor verification and claim pre-approval.'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => onNavigate('check-document')}
                      className="w-full py-3 px-4 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(197,242,88,0.35)] transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                      <span>Check My Document</span>
                    </button>

                    <button
                      onClick={onResumeClaim}
                      className="w-full py-2.5 px-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                    >
                      <span>Resume Claim Workflow</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  </div>
                </>
              )}

              {/* VIEW B: IF IN POLICY MODE */}
              {contextMode === 'policy' && activePolicyObj && (
                <>
                  <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Policy Specification</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#DEB7FF]/15 text-[#DEB7FF] text-[10px] font-bold">
                        Active Policy
                      </span>
                    </div>
                    <div className="space-y-2 text-xs pt-1">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">Product & Carrier</span>
                        <span className="text-white font-bold">{activePolicyObj.productName}</span>
                        <span className="text-zinc-400 block text-[11px]">{activePolicyObj.carrier}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Policy Number</span>
                          <span className="text-zinc-300 font-mono">{activePolicyObj.policyNumber}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Coverage Tier</span>
                          <span className="text-zinc-300">{activePolicyObj.coverageTier}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Compulsory Deductible</span>
                          <span className="text-zinc-300">{activePolicyObj.deductible}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block text-[10px]">Zero Depreciation</span>
                          <span className={activePolicyObj.hasZeroDep ? 'text-[#C5F258] font-semibold' : 'text-zinc-400'}>
                            {activePolicyObj.hasZeroDep ? '✓ 100% Covered' : 'Standard'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-2.5">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Policy Guidance Notes</span>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      This policy schedule includes direct electronic claim filing, cashless network billing, and Section 64-VB compliance endorsement.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedInitiationPolicy(activePolicyObj.policyNumber);
                        setActiveMode('initiate');
                      }}
                      className="w-full py-3 px-4 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      <span>Initiate Claim for this Policy</span>
                    </button>
                    <button
                      onClick={() => handleSwitchContext('no_context')}
                      className="w-full py-2 px-4 text-center text-xs text-zinc-400 hover:text-white transition-colors"
                    >
                      Switch to General Mode →
                    </button>
                  </div>
                </>
              )}

              {/* VIEW C: IF IN GENERAL / NO CONTEXT MODE */}
              {(contextMode === 'no_context' || (!activeClaim && contextMode === 'claim')) && (
                <>
                  <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span className="material-symbols-outlined text-[#C5F258] text-[18px]">gavel</span>
                      <span>IRDAI Adjudication Standards</span>
                    </div>
                    <div className="space-y-2.5 text-xs text-zinc-300">
                      <div className="p-2.5 rounded-xl bg-[#222] border border-white/5">
                        <strong className="text-white block text-[11px] mb-0.5">⏱️ 30-Day Settlement SLA</strong>
                        <span className="text-zinc-400 text-[11px] leading-snug block">Insurers must clear or reject claims within 30 days of surveyor report. Penal interest applies for delays.</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#222] border border-white/5">
                        <strong className="text-white block text-[11px] mb-0.5">📜 Delay Protection Rule</strong>
                        <span className="text-zinc-400 text-[11px] leading-snug block">Claims cannot be rejected solely for intimation delays if the cause was genuine and verifiable.</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#222] border border-white/5">
                        <strong className="text-white block text-[11px] mb-0.5">🏛️ Insurance Ombudsman</strong>
                        <span className="text-zinc-400 text-[11px] leading-snug block">Policyholders can escalate unresolved disputes up to ₹50 Lakhs free of charge.</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Policy Switchers if policies exist */}
                  {policies.length > 0 && (
                    <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-2.5">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Link Policy to Chat</span>
                      <div className="flex flex-col gap-1.5">
                        {policies.map(p => (
                          <button
                            key={p.id || p.policyNumber}
                            onClick={() => handleSwitchContext('policy', p.policyNumber)}
                            className="p-2.5 rounded-xl bg-[#252424] hover:bg-[#303030] text-left transition-colors flex items-center justify-between group"
                          >
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-white truncate block">{p.productName}</span>
                              <span className="text-[10px] text-zinc-400">{p.carrier} • {p.policyNumber}</span>
                            </div>
                            <span className="material-symbols-outlined text-[16px] text-zinc-500 group-hover:text-[#DEB7FF]">arrow_forward</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      onClick={() => setActiveMode('initiate')}
                      className="w-full py-3 px-4 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      <span>Initiate New Claim Journey</span>
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: INITIATE CLAIM DECK WITH ACCURATE POLICY SELECTOR                 */}
      {/* ========================================================================= */}
      {activeMode === 'initiate' && (
        <div className="flex flex-col gap-8">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1C1B1B] via-[#201F1F] to-[#1C1B1B] p-6 sm:p-8 border border-white/[0.08]">
            <div className="absolute -right-16 -top-24 w-80 h-80 rounded-full bg-[#632D93]/15 blur-3xl pointer-events-none" />
            <div className="absolute right-32 -bottom-16 w-56 h-56 rounded-full bg-[#C5F258]/10 blur-2xl pointer-events-none" />
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#632D93]/40 text-[#DEB7FF] text-xs font-semibold mb-3 border border-[#DEB7FF]/30">
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                <span>Zero Friction Claim Initiation</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-display mb-3">
                Initiate Your AI Claim Journey
              </h1>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
                Describe what happened in your own words, dictate by voice, or select your policy. AI Claim Pilot will instantly assemble your personalized document roadmap, pre-empt insurer objections, and guide you step-by-step.
              </p>
            </div>
          </div>

          {/* Grid Layout (7 cols / 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Input Deck */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="rounded-3xl bg-[#1C1B1B] p-6 border border-white/[0.08] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C5F258] via-[#DEB7FF] to-[#FFB691]" />

                {/* Header with Live Voice Action */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#632D93]/40 border border-[#DEB7FF]/30 flex items-center justify-center text-[#DEB7FF]">
                      <span className="material-symbols-outlined text-[22px]">record_voice_over</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">Incident Voice & Speech Dictation</h3>
                        <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                          AI Dictate Active
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Speak or type naturally. AI speech engine converts your voice into statutory claim dossier.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/10 text-xs text-zinc-300">
                    <span className="material-symbols-outlined text-[14px] text-[#C5F258]">lock</span>
                    <span>Encrypted Speech</span>
                  </div>
                </div>

                {/* Recording Controls */}
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <button
                    type="button"
                    onClick={toggleIncidentDictation}
                    className={`px-5 py-3 rounded-full font-bold text-xs flex items-center gap-2.5 transition-all shadow-md ${
                      isRecordingIncident
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {isRecordingIncident ? 'stop' : 'mic'}
                    </span>
                    <span>
                      {isRecordingIncident
                        ? `Recording Speech... 00:${recordingSecondsIncident < 10 ? `0${recordingSecondsIncident}` : recordingSecondsIncident}`
                        : 'Dictate Incident by Voice'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => simulateVoiceDictation("Yesterday afternoon around 4:30 PM on Ring Road, my car got rear-ended at a signal. Rear bumper cracked, tailgate dented, and right tail lamp broken. Driver agreed to cashless assessment.")}
                    className="px-4 py-3 rounded-full bg-[#201F1F] hover:bg-[#2A2A2A] text-zinc-200 text-xs font-semibold border border-white/10 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#DEB7FF]">play_circle</span>
                    <span>Instant Voice Demo</span>
                  </button>

                  {isRecordingIncident && (
                    <div className="flex items-center gap-1 text-xs text-[#C5F258]">
                      <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-ping" />
                      <span>Mic Active (Listening...)</span>
                    </div>
                  )}

                  {isTranscribingIncident && (
                    <div className="flex items-center gap-1 text-xs text-[#DEB7FF]">
                      <span className="w-3 h-3 border-2 border-[#DEB7FF] border-t-transparent rounded-full animate-spin" />
                      <span>Transcribing audio...</span>
                    </div>
                  )}
                </div>

                {incidentMicError && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">warning</span>
                    <span>{incidentMicError}</span>
                  </div>
                )}

                {/* Narrative Textarea */}
                <div className="relative mb-5">
                  <textarea
                    value={incidentText}
                    onChange={(e) => setIncidentText(e.target.value)}
                    rows={4}
                    placeholder="Speak using the button above or type: e.g., Yesterday afternoon on Ring Road, my Creta got rear-ended at a signal. Rear bumper and headlamp broken..."
                    className="w-full p-4 rounded-2xl bg-[#141414] border border-white/[0.1] focus:border-[#C5F258] text-white placeholder-zinc-500 text-sm outline-none resize-none leading-relaxed transition-all"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIncidentText("Commercial truck backed into front bumper at petrol pump. Fiber bumper cracked, right headlamp broken. Third-party driver provided phone number.")}
                      className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[13px] text-[#C5F258]">lightbulb</span>
                      <span>Sample</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleIncidentDictation}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isRecordingIncident
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-zinc-800 hover:bg-[#632D93] text-zinc-300 hover:text-white'
                      }`}
                      title={isRecordingIncident ? 'Stop speech recording & transcribe' : 'Dictate incident by voice'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isRecordingIncident ? 'stop' : 'mic'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Quick Voice Presets */}
                <div className="mb-6">
                  <span className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-2.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-[#C5F258]">mic</span>
                    <span>Click Any Preset to Simulate Spoken Voice Dictation</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => simulateVoiceDictation("Car collision at traffic intersection on Ring Road. Front bumper cracked, bonnet dented, radiator leaking. Towing requested to cashless garage.")}
                      className="px-3 py-1.5 rounded-full bg-[#252424] hover:bg-[#632D93]/40 border border-white/5 hover:border-[#DEB7FF]/40 text-xs text-zinc-200 transition-all flex items-center gap-1.5"
                    >
                      <span>🚗</span>
                      <span>Bumper & Fender Collision</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateVoiceDictation("Heavy downpour led to severe basement waterlogging in Koramangala. Vehicle submerged to bonnet level, engine failed to crank this morning. Hydrostatic lock suspected.")}
                      className="px-3 py-1.5 rounded-full bg-[#252424] hover:bg-[#632D93]/40 border border-white/5 hover:border-[#DEB7FF]/40 text-xs text-zinc-200 transition-all flex items-center gap-1.5"
                    >
                      <span>🌧️</span>
                      <span>Waterlogging & Seizure</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateVoiceDictation("Emergency hospitalization yesterday midnight for acute abdominal pain. Admitted under cashless facility at Apollo Hospital. Pre-authorization request required.")}
                      className="px-3 py-1.5 rounded-full bg-[#252424] hover:bg-[#632D93]/40 border border-white/5 hover:border-[#DEB7FF]/40 text-xs text-zinc-200 transition-all flex items-center gap-1.5"
                    >
                      <span>🏥</span>
                      <span>Emergency Hospitalization</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateVoiceDictation("International flight cancelled with less than 6 hours notice. Lost prepaid hotel booking and 24hr delayed luggage arrival in Frankfurt.")}
                      className="px-3 py-1.5 rounded-full bg-[#252424] hover:bg-[#632D93]/40 border border-white/5 hover:border-[#DEB7FF]/40 text-xs text-zinc-200 transition-all flex items-center gap-1.5"
                    >
                      <span>✈️</span>
                      <span>Flight & Baggage Delay</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => simulateVoiceDictation("Two-wheeler skidded over oil slick on elevated highway. Exhaust guard dented, mirror shattered, road rash treated at local clinic.")}
                      className="px-3 py-1.5 rounded-full bg-[#252424] hover:bg-[#632D93]/40 border border-white/5 hover:border-[#DEB7FF]/40 text-xs text-zinc-200 transition-all flex items-center gap-1.5"
                    >
                      <span>🏍️</span>
                      <span>Bike Skid & Third-Party</span>
                    </button>
                  </div>
                </div>

                {/* REAL DYNAMIC POLICY SELECTOR BLOCK (Solves Problem 1) */}
                <div className="p-4 rounded-2xl bg-[#131313] border border-white/[0.08] mb-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[17px] text-[#C5F258]">verified_user</span>
                      <span>Link Policy for this Claim</span>
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {selectedInitiationPolicy === 'none' ? 'Freeform Mode' : 'Policy Selected'}
                    </span>
                  </div>

                  {/* Policy Selection Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Option: No Policy (Freeform) */}
                    <button
                      type="button"
                      onClick={() => setSelectedInitiationPolicy('none')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        selectedInitiationPolicy === 'none'
                          ? 'bg-[#1F1F1F] border-[#C5F258] text-white shadow-sm'
                          : 'bg-[#181818] border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                        selectedInitiationPolicy === 'none' ? 'border-[#C5F258] bg-[#C5F258]' : 'border-zinc-600'
                      }`}>
                        {selectedInitiationPolicy === 'none' && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                      <div>
                        <strong className="text-xs text-white block">No Pre-Linked Policy</strong>
                        <span className="text-[11px] text-zinc-400 block leading-tight">Freeform capture; AI auto-detects category & checklist</span>
                      </div>
                    </button>

                    {/* Available Policies from Database */}
                    {policies.map(p => {
                      const isSel = selectedInitiationPolicy === p.policyNumber;
                      const vTitle = p.vehicle?.makeModel ? p.vehicle.makeModel : (p.sumInsured ? `Sum Insured: ${p.sumInsured}` : p.productName);
                      return (
                        <button
                          key={p.id || p.policyNumber}
                          type="button"
                          onClick={() => setSelectedInitiationPolicy(p.policyNumber)}
                          className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                            isSel
                              ? 'bg-[#1F1F1F] border-[#C5F258] text-white shadow-sm'
                              : 'bg-[#181818] border-white/5 text-zinc-400 hover:text-white'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center shrink-0 ${
                            isSel ? 'border-[#C5F258] bg-[#C5F258]' : 'border-zinc-600'
                          }`}>
                            {isSel && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>
                          <div className="min-w-0">
                            <strong className="text-xs text-white truncate block">{p.carrier}</strong>
                            <span className="text-[11px] text-zinc-400 truncate block">{vTitle}</span>
                            <span className="text-[10px] text-zinc-500 font-mono block">{p.policyNumber}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback on selection */}
                  <div className="text-[11px] text-zinc-400 pt-1 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-[#DEB7FF]">info</span>
                    <span>
                      {selectedInitiationPolicy === 'none'
                        ? 'No active policy pre-linked. You can attach a policy schedule after the claim roadmap is generated.'
                        : `Claim will be filed under policy ${selectedInitiationPolicy}.`}
                    </span>
                  </div>
                </div>

                {/* Launch CTA */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleLaunchClaimJourney}
                    disabled={!incidentText.trim() || isConvertingIncident}
                    className="w-full py-3.5 px-6 rounded-full bg-[#C5F258] hover:bg-[#b8e748] disabled:opacity-50 text-[#151F00] font-bold text-sm shadow-[0_4px_24px_-4px_rgba(197,242,88,0.35)] transition-all flex items-center justify-center gap-2"
                  >
                    {isConvertingIncident ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#151F00] border-t-transparent rounded-full animate-spin" />
                        <span>Converting Speech/Text to Claim Journey...</span>
                      </>
                    ) : (
                      <>
                        <span>Launch AI Claim Journey</span>
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[11px] text-zinc-400">
                    AI automatically maps to IRDAI guidelines & surveyor claim codes without legal jargon.
                  </p>
                </div>

                {/* Conversion Output Card */}
                {conversionResult && (
                  <div className="mt-5 p-4 rounded-2xl bg-[#131313] border border-[#C5F258]/40 shadow-xl space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-ping" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Claim Journey Synthesized in Database
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#C5F258]/20 text-[#C5F258] font-mono font-bold text-xs">
                        {conversionResult.claim?.claimNumber}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1C1B1B] text-xs space-y-1.5">
                      <div className="text-white font-semibold">
                        {conversionResult.aiAnalysis?.detectedCategory} • Severity: <span className="text-[#C5F258] uppercase font-bold">{conversionResult.aiAnalysis?.severity}</span>
                      </div>
                      <p className="text-zinc-400 text-[11px]">
                        Estimated Cost Range: <strong className="text-white">₹{conversionResult.aiAnalysis?.estimatedCostRange?.min?.toLocaleString('en-IN')} - ₹{conversionResult.aiAnalysis?.estimatedCostRange?.max?.toLocaleString('en-IN')}</strong>
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {conversionResult.aiAnalysis?.damagesIdentified?.map((d: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-[#2A2A2A] text-zinc-300 text-[10px]">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#201F1F] text-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-zinc-300 text-[11px]">
                        <span className="material-symbols-outlined text-[16px] text-[#C5F258]">verified</span>
                        <span>{conversionResult.aiAnalysis?.firRequired ? 'Police GD / FIR record flagged' : 'Single vehicle collision: No police report mandatory'}</span>
                      </div>
                      <button
                        onClick={() => {
                          onResumeClaim();
                        }}
                        className="px-4 py-2 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs flex items-center gap-1 shrink-0 shadow-md"
                      >
                        <span>Open Claim Workflow</span>
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: AI Flight Plan & Advantage Rail */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              {/* Flight Plan Card */}
              <div className="rounded-3xl bg-[#1C1B1B] p-6 border border-white/[0.08] shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#632D93] flex items-center justify-center text-[#DEB7FF]">
                      <span className="material-symbols-outlined text-[16px]">route</span>
                    </div>
                    <h3 className="text-base font-bold text-white">Your AI Flight Plan</h3>
                  </div>
                  <span className="text-xs text-[#C5F258] bg-[#C5F258]/10 px-2.5 py-0.5 rounded-full font-semibold">
                    Automated
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mb-5">
                  Once initiated, ClaimEase constructs an adaptive dossier engineered for zero-repudiation approval.
                </p>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#C5F258] text-[#151F00] text-xs font-bold flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Clause & Coverage Extraction</h5>
                      <p className="text-xs text-zinc-400 leading-snug">Parses policy wordings, zero-dep add-ons, and exclusion clauses against your incident.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-[#DEB7FF] text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Bespoke Document Checklist</h5>
                      <p className="text-xs text-zinc-400 leading-snug">Assembles exact requirement list: only essential proofs requested, zero unnecessary overhead.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0">
                      3
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Forensic OCR Pre-Flight</h5>
                      <p className="text-xs text-zinc-400 leading-snug">Detects blurry images, mismatched registration dates, and missing hospital stamps before submission.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0">
                      4
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Section 64-VB Compliance Shield</h5>
                      <p className="text-xs text-zinc-400 leading-snug">Validates premium endorsement timing and pre-empts surveyor technical objections.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0">
                      5
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Direct Insurer Webhook Push</h5>
                      <p className="text-xs text-zinc-400 leading-snug">Delivers instant EDI dispatch with real-time claims tracking & surveyor allocation.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Advantage Metrics Card */}
              <div className="rounded-3xl bg-[#1C1B1B] p-6 border border-white/[0.08] shadow-xl flex flex-col gap-4">
                <h3 className="text-base font-bold text-white">Why Initiate with ClaimEase?</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#131313]">
                    <span className="text-3xl font-extrabold text-[#C5F258] font-display block mb-1">4.2x</span>
                    <span className="text-xs font-semibold text-white block">Faster Payouts</span>
                    <span className="text-[11px] text-zinc-500">Pre-vetted docs skip queues</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#131313]">
                    <span className="text-3xl font-extrabold text-[#DEB7FF] font-display block mb-1">99.4%</span>
                    <span className="text-xs font-semibold text-white block">Zero-Objection Rate</span>
                    <span className="text-[11px] text-zinc-500">Pre-empts claim repudiation</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-300 pt-1">
                  <span className="material-symbols-outlined text-[#C5F258] text-[18px]">verified</span>
                  <span>Compliant with IRDAI Protection of Policyholders' Interests Regulations (2024).</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
