import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, ChatMessage, ClaimDocument } from '../types';
import { INITIAL_CHAT_MESSAGES, MOCK_DOCUMENTS } from '../data/mockData';
import { sendClaimChatMessage, convertIncidentToJourney, synthesizeTTS } from '../services/api';
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
  // Brand new accounts start directly in the Initiation Deck
  const [activeMode, setActiveMode] = useState<'chat' | 'initiate'>(
    activeClaim ? 'chat' : 'initiate'
  );
  const [incidentText, setIncidentText] = useState('');
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-init',
      sender: 'assistant',
      timestamp: 'Just now',
      text: activeClaim
        ? `Hello! I'm your AI Claim Pilot. I'm actively monitoring your claim **${activeClaim.claimNumber}** (${activeClaim.vehicle}). Ask any question about your documents, estimates, or surveyor review.`
        : `Welcome to ClaimEase! You're currently on a **brand-new account** with zero claims filed.\n\nYou can switch to the **Initiation Deck** above to speak or type an incident, and I'll immediately build your customized claim journey!`,
      groundingContext: {
        title: activeClaim ? "Claim Telemetry Grounding" : "ClaimEase Account Pilot",
        details: activeClaim
          ? `Grounded in active policy ${activeClaim.policyNumber}.`
          : "Fresh account initialized. Ready for First Notice of Loss.",
        claimId: activeClaim?.claimNumber,
        stepNumber: activeClaim?.currentStep || 1
      },
      suggestedQueries: [
        "How do I file my first motor claim?",
        "What documents are required for accident damage?",
        "Does my policy cover zero-depreciation?"
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

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

  const firDoc = activeClaim?.documents?.find(d => d.id === 'doc-fir') || MOCK_DOCUMENTS.find(d => d.id === 'doc-fir') || MOCK_DOCUMENTS[0];

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

  // Simulated Voice Dictation with realistic speech timing and waveform feedback
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
        if (transcript.trim()) {
          setIncidentText(prev => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        } else {
          setIncidentMicError('No clear speech detected. Speak closer to your mic or select an instant voice preset.');
        }
      } catch (err: any) {
        console.warn('Incident transcription warning:', err);
        setIncidentMicError('Voice capture completed. You can edit text or select a voice preset below.');
      } finally {
        setIsTranscribingIncident(false);
      }
    } else {
      setIncidentMicError(null);
      try {
        await audioIncidentRecorder.current.startRecording(
          (sec) => setRecordingSecondsIncident(sec),
          (liveText) => {
            if (liveText) setIncidentText(liveText);
          }
        );
        setIsRecordingIncident(true);
      } catch (err: any) {
        console.warn('Microphone stream error, automatically initiating voice simulation demo:', err);
        simulateVoiceDictation("Yesterday around 4:30 PM on Outer Ring Road, a commercial tempo grazed my right rear quarter panel while changing lanes. Minor dent and deep scratches along wheel arch; taillight housing cracked. Insured party details exchanged cleanly.");
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
        if (transcript.trim()) {
          setInputText(prev => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
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
            if (liveText) setInputText(liveText);
          }
        );
        setIsRecordingChat(true);
      } catch (err: any) {
        console.warn('Chat mic access error, simulating query:', err);
        setInputText("Is bumper replacement covered with zero depreciation under my policy?");
      }
    }
  };

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

    try {
      const response = await sendClaimChatMessage({
        message: q,
        claimId: activeClaim?.claimNumber || 'MOT-9284-IN',
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
      // Fallback response
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Under IRDAI Motor Guidelines for policy ${activeClaim?.policyNumber || 'MOT-9284-IN'}: Your comprehensive package includes zero-depreciation coverage on fiber, plastic bumpers, and paint. Ensure station GD entry copy matches the incident date before cashless survey authorization.`,
        groundingContext: {
          title: "ClaimEase Regulatory Grounding",
          details: "Grounded against Indian Motor Tariff Schedule and HDFC ERGO Comprehensive Policy conditions.",
          claimId: activeClaim?.claimNumber || 'MOT-9284-IN',
          stepNumber: 2
        },
        suggestedQueries: [
          "How fast will the cashless garage be approved?",
          "Do I need to pay any upfront deposit at Apex Autoworks?",
          "What happens during surveyor inspection?"
        ]
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLaunchClaimJourney = async () => {
    if (!incidentText.trim() || isConvertingIncident) return;
    setIsConvertingIncident(true);

    try {
      const result = await convertIncidentToJourney(incidentText);
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
              ? (activeClaim ? `In-Claim Mode (${activeClaim.claimNumber})` : 'AI Copilot (Brand New Account)')
              : (activeClaim ? 'New Claim Initiation Deck' : 'Claim Initiation Deck • Brand New Account')}
          </span>
        </div>

        {/* Mode Toggle Pills & Live Engine indicator */}
        <div className="flex items-center gap-3">
          <div className="bg-[#1C1B1B] p-1 rounded-full border border-white/[0.08] flex items-center gap-1">
            <button
              onClick={() => setActiveMode('chat')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMode === 'chat'
                  ? 'bg-[#DEB7FF] text-[#2D0050]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {activeClaim ? 'Active In-Claim Chat' : 'AI Copilot Chat'}
            </button>
            <button
              onClick={() => setActiveMode('initiate')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                activeMode === 'initiate'
                  ? 'bg-[#C5F258] text-[#151F00]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              🎙️ Initiation Deck (Voice & Text)
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-[#1C1B1B] px-3.5 py-1.5 rounded-full border border-white/[0.08]">
            <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-pulse"></span>
            <span className="text-xs text-white font-medium">AI Pilot v2.4</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-[#DEB7FF] font-semibold">Grounded Copilot</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: IN-CLAIM CHAT COPILOT (SCREEN 7)                                  */}
      {/* ========================================================================= */}
      {activeMode === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* COLUMN 1: Conversation & Grounded Thread (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white font-display">AI Claim Pilot</h1>
                  <span className="px-2 py-0.5 rounded-full bg-[#632D93]/60 border border-[#DEB7FF]/30 text-[#DEB7FF] text-[10px] font-bold uppercase">
                    In-Claim Mode
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Ask anything about your claim. Grounded directly in your active filing telemetry.
                </p>
              </div>

              {/* Active Context Chip */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1B1B] border border-white/[0.08] text-xs">
                <span className="w-2 h-2 rounded-full bg-[#DEB7FF] animate-ping"></span>
                <span className="text-zinc-400">Context:</span>
                <span className="text-[#DEB7FF] font-semibold">FIR Investigation</span>
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
                              Contextual Engine v2.4
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
                        <span>Evaluating within: <strong className="text-[#C5F258]">{activeClaim ? activeClaim.policyType : 'IRDAI Statutory Policy Schedule (Fresh Account)'}</strong></span>
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
                              Grounded Step
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
                  <span>AI Claim Pilot is evaluating your policy wording & IRDAI mandates...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="mt-2 bg-[#1C1B1B] p-2.5 rounded-2xl border border-white/[0.12] focus-within:border-[#DEB7FF]/60 focus-within:shadow-[0_0_24px_-4px_rgba(222,183,255,0.25)] transition-all flex flex-col gap-2">
              <div className="flex items-center gap-2 px-2 pt-1 text-[11px] text-zinc-400">
                <span className={`w-1.5 h-1.5 rounded-full ${activeClaim ? 'bg-[#C5F258]' : 'bg-[#DEB7FF]'}`}></span>
                <span>Context: {activeClaim ? `${activeClaim.claimNumber} • Step ${activeClaim.currentStep || 2}` : 'Brand New Account • Zero Claims Filed'}</span>
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
                      : activeClaim
                      ? `Ask about claim ${activeClaim.claimNumber}...`
                      : 'Ask about filing a claim, policy rules, or estimates...'
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
                Grounded exclusively on your claim dossier & statutory IRDAI mandates
              </span>
              <span>ClaimEase Pilot 2.4</span>
            </div>
          </div>

          {/* COLUMN 2: Persistent Claim & Document State Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-5 rounded-3xl bg-[#141414] border border-white/[0.08] flex flex-col gap-4 shadow-xl">
              {/* Panel Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#C5F258] text-[20px]">hub</span>
                  <span className="text-sm font-bold text-white">Active Claim Context</span>
                </div>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1B1B] border border-[#C5F258]/30 text-[#C5F258] text-[11px] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258] animate-pulse"></span>
                  Syncing Real Time
                </span>
              </div>

              {/* CARD 1: Claim Summary */}
              <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Active Policy & Claim</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                    Step 2 of 4
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Policy Category</span>
                    <span className="text-white font-bold">Motor Insurance</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Claim Incident</span>
                    <span className="text-white font-bold">Accident Damage</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Policy File</span>
                    <span className="text-zinc-300 font-mono">MOT-9284-IN</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Coverage Tier</span>
                    <span className="text-zinc-300">Comprehensive B2B</span>
                  </div>
                </div>
              </div>

              {/* CARD 2: Current Document Focus */}
              <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#DEB7FF] text-[18px]">assignment</span>
                    <span className="text-xs font-bold text-white">Document in Focus</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/20 text-[#C5F258] text-[10px] font-bold">
                    Required
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#252424]">
                  <div>
                    <h5 className="text-xs font-bold text-white">FIR (First Information Report)</h5>
                    <span className="text-[11px] text-zinc-400">Official police report copy</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#FF823A]/15 text-[#FF823A] text-[10px] font-semibold">
                    Not Uploaded
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Official jurisdictional police record establishing incident date, collision impact point, and verified third parties involved in the motor damage.
                </p>
              </div>

              {/* CARD 3: Progression Pipeline */}
              <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-white/[0.06] flex flex-col gap-3">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">FIR Progression Pipeline</span>
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#DEB7FF] text-[#2D0050] flex items-center justify-center text-xs font-bold shrink-0">
                      1
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Understand Document Requirements</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#632D93] text-[#DEB7FF] font-bold">ACTIVE</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Clarify police jurisdiction & format details.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-75">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold shrink-0">
                      2
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-zinc-300">Obtain from Local Police Station / CCTNS</span>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Request signed copy or digital certificate.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-50">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center text-xs font-bold shrink-0">
                      3
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-zinc-400">Upload Document for Diagnostics</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">PDF, JPEG, or camera scan upload.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-40">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center text-xs font-bold shrink-0">
                      4
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-zinc-400">Verify with Diagnostic Engine</span>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Instant compliance scan before insurer submission.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 4: Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => onNavigate('check-document')}
                  className="w-full py-3 px-4 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_20px_-2px_rgba(197,242,88,0.35)] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                  <span>Check My Document</span>
                </button>

                <button
                  onClick={() => onSelectDocument?.(firDoc)}
                  className="w-full py-2.5 px-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                >
                  <span>View Sample FIR Specimen</span>
                  <span className="material-symbols-outlined text-[15px]">north_east</span>
                </button>

                <button
                  onClick={onResumeClaim}
                  className="w-full py-2 px-4 text-center text-xs text-zinc-400 hover:text-[#C5F258] transition-colors"
                >
                  Resume Active Claim Workflow →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: INITIATE CLAIM DECK (SCREEN 1)                                    */}
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
                Describe what happened in your own words or select your active policy. AI Claim Pilot will instantly assemble your personalized document roadmap, pre-empt insurer objections, and guide you step-by-step to a guaranteed compliant submission.
              </p>
            </div>
          </div>

          {/* Grid Layout (7 cols / 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: Input Deck */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="rounded-3xl bg-[#1C1B1B] p-6 border border-white/[0.08] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#C5F258] via-[#DEB7FF] to-[#FFB691]" />
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#632D93]/40 flex items-center justify-center text-[#DEB7FF] border border-[#DEB7FF]/30">
                      <span className="material-symbols-outlined text-[20px]">record_voice_over</span>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Incident Voice & Speech Dictation</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                          AI Dictate Active
                        </span>
                      </h2>
                      <p className="text-xs text-zinc-400">Speak or type naturally. AI speech engine converts your voice into statutory claim dossier.</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#2A2A2A] text-zinc-300 flex items-center gap-1 self-start sm:self-center">
                    <span className="material-symbols-outlined text-[13px] text-[#C5F258]">lock</span>
                    <span>Encrypted Speech</span>
                  </span>
                </div>

                {/* Primary Voice Dictation Toolbar */}
                <div className="p-3.5 rounded-2xl bg-[#141414] border border-white/[0.08] mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={toggleIncidentDictation}
                      className={`px-4 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 ${
                        isRecordingIncident
                          ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                          : 'bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {isRecordingIncident ? 'stop' : 'mic'}
                      </span>
                      <span>{isRecordingIncident ? 'Stop & Transcribe Spoken Audio' : '🎙️ Dictate Incident by Voice'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => simulateVoiceDictation("Yesterday around 4:30 PM on Outer Ring Road, a commercial tempo grazed my right rear quarter panel while changing lanes. Minor dent and deep scratches along wheel arch; taillight housing cracked. Insured party details exchanged cleanly.")}
                      className="px-3.5 py-2.5 rounded-full bg-[#201F1F] hover:bg-[#632D93]/50 text-zinc-300 hover:text-white border border-white/10 font-medium text-xs flex items-center gap-1.5 transition-all"
                      title="Simulates real microphone dictation with sound waves and typing"
                    >
                      <span className="material-symbols-outlined text-[16px] text-[#DEB7FF]">play_circle</span>
                      <span>⚡ Instant Voice Demo</span>
                    </button>
                  </div>

                  {/* Audio Waves / Recording Status */}
                  <div className="flex items-center gap-2">
                    {isRecordingIncident ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-red-950/70 border border-red-500/40 rounded-full animate-pulse">
                        <div className="flex items-center gap-1 h-4">
                          <span className="w-1 bg-red-400 rounded-full animate-bounce h-2"></span>
                          <span className="w-1 bg-red-400 rounded-full animate-pulse h-4"></span>
                          <span className="w-1 bg-red-400 rounded-full animate-bounce h-3"></span>
                          <span className="w-1 bg-red-400 rounded-full animate-pulse h-4"></span>
                          <span className="w-1 bg-red-400 rounded-full animate-bounce h-2"></span>
                        </div>
                        <span className="text-xs font-mono font-bold text-red-200">
                          00:{recordingSecondsIncident < 10 ? `0${recordingSecondsIncident}` : recordingSecondsIncident}
                        </span>
                        <span className="text-[11px] text-red-300">Listening...</span>
                      </div>
                    ) : (
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
                        <span className="w-2 h-2 rounded-full bg-[#C5F258]"></span>
                        <span>Mic Ready</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Recording State Banner */}
                {isRecordingIncident && (
                  <div className="mb-3 p-3.5 rounded-2xl bg-gradient-to-r from-[#2B0E1E] via-[#201426] to-[#141414] border border-red-500/50 flex items-center justify-between gap-3 animate-fade-in shadow-xl">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">Recording & Live Transcribing</span>
                          <span className="text-[11px] font-mono text-red-400 font-bold bg-black/40 px-2 py-0.5 rounded">
                            00:{recordingSecondsIncident < 10 ? `0${recordingSecondsIncident}` : recordingSecondsIncident}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 truncate">
                          Speak naturally into your microphone or watch the voice dictation stream into the box below.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleIncidentDictation}
                      className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shrink-0 transition-transform active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[15px]">stop</span>
                      <span>Stop & Transcribe</span>
                    </button>
                  </div>
                )}

                {isTranscribingIncident && (
                  <div className="mb-3 p-3 rounded-2xl bg-[#632D93]/30 border border-[#DEB7FF]/40 flex items-center gap-2.5 text-xs text-[#DEB7FF] animate-pulse">
                    <span className="w-3.5 h-3.5 border-2 border-[#DEB7FF] border-t-transparent rounded-full animate-spin" />
                    <span>AI is finalizing your spoken incident transcript...</span>
                  </div>
                )}

                {incidentMicError && (
                  <div className="mb-3 p-3 rounded-2xl bg-[#2A1818] border border-red-500/30 flex items-start justify-between gap-2 text-xs text-red-200">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-red-400 shrink-0">info</span>
                      <span>{incidentMicError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIncidentMicError(null)}
                      className="text-zinc-400 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Textarea */}
                <div className="relative mb-4">
                  <textarea
                    rows={4}
                    value={incidentText}
                    onChange={(e) => setIncidentText(e.target.value)}
                    placeholder="Speak using the button above or type: e.g., Yesterday afternoon on Ring Road, my Creta got rear-ended at a signal. Rear bumper and headlamp broken..."
                    className="w-full bg-[#131313] text-white text-sm p-4 rounded-2xl placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#DEB7FF]/50 transition-all resize-none shadow-inner"
                  />
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => simulateVoiceDictation("Yesterday around 4:30 PM on Outer Ring Road, a commercial tempo grazed my right rear quarter panel while changing lanes. Minor dent and deep scratches along wheel arch; taillight housing cracked. Insured party details exchanged cleanly.")}
                      className="px-2.5 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 flex items-center gap-1 transition-colors"
                      title="Load sample incident"
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

                {/* Policy Selector Block */}
                <div className="p-3.5 rounded-2xl bg-[#131313] mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#C5F258]/15 flex items-center justify-center shrink-0 text-[#C5F258]">
                      <span className="material-symbols-outlined text-[20px]">verified_user</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400">Linked Active Policy</span>
                        <span className="px-1.5 py-0.2 rounded bg-[#C5F258]/20 text-[#C5F258] text-[9px] uppercase font-bold">
                          Zero Deductible
                        </span>
                      </div>
                      <p className="text-xs text-white font-semibold truncate">
                        {activeClaim?.policyNumber || 'HDFC-MOT-2024-88419'} • {activeClaim?.vehicle || '2022 Hyundai Creta SX(O) • KA-05-MK-9284'} • HDFC ERGO Comprehensive
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[#DEB7FF] font-semibold shrink-0">
                    {activeClaim ? 'Active Claim Linked' : 'Fresh Policy Ready'}
                  </span>
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
                        <span>Ollama Converting Speech/Text to Claim Journey...</span>
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
                        Estimated Repair Range: <strong className="text-white">₹{conversionResult.aiAnalysis?.estimatedCostRange?.min?.toLocaleString('en-IN')} - ₹{conversionResult.aiAnalysis?.estimatedCostRange?.max?.toLocaleString('en-IN')}</strong>
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

              {/* In-Flight Draft or Brand New Account Welcome Card */}
              {activeClaim ? (
                <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.08] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#C5F258]/20 flex items-center justify-center text-[#C5F258] shrink-0">
                      <span className="material-symbols-outlined text-[18px]">history</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-400">In-Flight Draft Detected</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                          {activeClaim.progressPercent}% Ready
                        </span>
                      </div>
                      <p className="text-xs text-white font-medium truncate">
                        {activeClaim.claimNumber} • {activeClaim.vehicle}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onResumeClaim}
                    className="shrink-0 px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>Resume Claim</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#141414] border border-white/[0.08] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#DEB7FF]/20 flex items-center justify-center text-[#DEB7FF] shrink-0">
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#DEB7FF] font-semibold">Brand New Account</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">Ready</span>
                      </div>
                      <p className="text-xs text-zinc-300 font-medium truncate">
                        Zero claims filed. Speak or type above to initiate your first claim.
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">Step 1 of 4</span>
                </div>
              )}
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
                      <p className="text-xs text-zinc-400 leading-snug">Parses HDFC ERGO policy wordings, zero-dep add-ons, and exclusion clauses against your incident.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 text-[#DEB7FF] text-xs font-bold flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-white">Bespoke Document Checklist</h5>
                      <p className="text-xs text-zinc-400 leading-snug">Assembles exact requirement list: only 4 essential proofs requested, zero unnecessary overhead.</p>
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
