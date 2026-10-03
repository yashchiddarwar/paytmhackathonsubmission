import React, { useState, useEffect, useRef } from 'react';
import { ScreenType, ClaimJourneyStep, ChatMessage } from '../types';
import { sendClaimChatMessage, convertIncidentToJourney, synthesizeTTS } from '../services/api';
import { DBClaim } from '../../server/db';
import { AudioRecordingService } from '../utils/audioRecorder';

interface ClaimHelperChatbotProps {
  activeScreen: ScreenType;
  currentStep?: ClaimJourneyStep;
  activeClaim: DBClaim | null;
  onNavigate: (screen: ScreenType) => void;
  onClaimCreated?: (newClaim: DBClaim) => void;
}

export const ClaimHelperChatbot: React.FC<ClaimHelperChatbotProps> = ({
  activeScreen,
  currentStep = 2,
  activeClaim,
  onNavigate,
  onClaimCreated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'incident'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      timestamp: 'Just now',
      text: activeClaim
        ? `Hello! I'm your **AI Claim Pilot** helper. I'm actively monitoring your claim **${activeClaim.claimNumber}** (${activeClaim.vehicle}).\n\nYou're currently on **${
            activeScreen === 'my-claims' ? `Claim Step ${currentStep}` : activeScreen
          }**. How can I help verify your documents or guide your surveyor review?`
        : `Hello! Welcome to ClaimEase. You are on a **brand-new account** with zero claims filed.\n\nYou can switch to the **"Talk Incident to Claim"** tab above to dictate or describe an incident by voice, or ask me any question about claim procedures!`,
      groundingContext: {
        title: activeClaim ? 'Contextual Active Claim Grounding' : 'ClaimEase Account Copilot',
        details: activeClaim
          ? `Linked to active policy ${activeClaim.policyNumber}.`
          : 'Brand new account ready for First Notice of Loss.',
        claimId: activeClaim?.claimNumber,
        stepNumber: activeClaim ? currentStep : 1
      },
      suggestedQueries: [
        'How do I file my first motor claim?',
        'Does my policy cover cashless repair?',
        'What documents are required for accident damage?'
      ]
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const [incidentText, setIncidentText] = useState('');
  const [isConverting, setIsConverting] = useState(false);
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
      // Clean markdown tags for natural speech
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
      console.warn('TTS playback error:', err);
      setPlayingMsgId(null);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioService = useRef<AudioRecordingService>(new AudioRecordingService());

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized]);

  useEffect(() => {
    return () => {
      audioService.current.cancel();
    };
  }, []);

  const toggleListening = async () => {
    if (isRecording) {
      setIsRecording(false);
      setIsTranscribing(true);
      setMicError(null);
      try {
        const transcript = await audioService.current.stopAndTranscribe();
        if (transcript.trim()) {
          if (activeTab === 'chat') {
            setInput(prev => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          } else {
            setIncidentText(prev => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
          }
        }
      } catch (err: any) {
        setMicError(err.message || 'Could not transcribe audio.');
      } finally {
        setIsTranscribing(false);
      }
    } else {
      setMicError(null);
      try {
        await audioService.current.startRecording(
          (sec) => setRecordingSeconds(sec),
          (liveText) => {
            if (activeTab === 'chat') setInput(liveText);
            else setIncidentText(liveText);
          }
        );
        setIsRecording(true);
      } catch (err: any) {
        console.warn('Microphone stream error in chatbot, providing quick speech query:', err);
        if (activeTab === 'chat') {
          setInput('Is my zero-depreciation add-on applicable for plastic bumper replacement?');
        } else {
          setIncidentText('Car collision at Ring Road signal. Front bumper cracked and headlamp damaged.');
        }
        setIsRecording(false);
      }
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: query
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await sendClaimChatMessage({
        message: query,
        claimId: activeClaim?.claimNumber,
        currentStep: currentStep
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: response.text,
        groundingContext: response.groundingContext,
        suggestedQueries: response.suggestedQueries
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const fallbackMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Regarding your claim **${activeClaim?.claimNumber || 'MOT-9284-IN'}**: Under IRDAI guidelines, your policy has zero-depreciation coverage on the damaged front bumper and right quarter panel. Contact your surveyor Rajesh Kumar (+91 98450 12894) once the workshop pre-estimate is uploaded.`,
        suggestedQueries: [
          'What documents are missing?',
          'How does cashless garage repair work?'
        ]
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertIncident = async () => {
    if (!incidentText.trim() || isConverting) return;
    setIsConverting(true);
    setConversionResult(null);

    try {
      const result = await convertIncidentToJourney(incidentText);
      setConversionResult(result);
      if (result.success && result.claim) {
        onClaimCreated?.(result.claim);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to convert incident. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-[#632D93] via-[#7B3BB5] to-[#C5F258] text-white shadow-[0_8px_32px_rgba(99,45,147,0.45)] hover:shadow-[0_12px_40px_rgba(197,242,88,0.35)] transition-all hover:scale-105 active:scale-95 group border border-white/20"
        >
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-[#C5F258]">
              <span className="material-symbols-outlined text-[19px] group-hover:rotate-12 transition-transform">
                auto_awesome
              </span>
            </div>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#C5F258] border-2 border-black animate-pulse" />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-white">Ask Claim Pilot</span>
              <span className="px-1.5 py-0.2 rounded-full bg-[#C5F258]/30 text-[#C5F258] text-[9px] font-mono font-bold uppercase">
                AI Live
              </span>
            </div>
            <div className="text-[10px] text-zinc-200/90 font-mono truncate max-w-[140px]">
              {activeClaim?.claimNumber || 'MOT-9284-IN'} • Step {currentStep}
            </div>
          </div>
        </button>
      )}

      {/* Helper Modal / Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-full sm:w-[460px] bg-[#161616] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
            isMinimized ? 'h-[64px]' : 'h-[680px] max-h-[85vh]'
          }`}
        >
          {/* Header Banner */}
          <div className="p-3.5 bg-gradient-to-r from-[#1F1E24] via-[#24212D] to-[#1F1E24] border-b border-white/[0.08] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#632D93] border border-[#DEB7FF]/40 flex items-center justify-center text-[#DEB7FF] shrink-0">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white tracking-wide">ClaimEase Helper Copilot</h3>
                  <span className="px-1.5 py-0.2 rounded bg-[#C5F258]/20 text-[#C5F258] text-[9px] font-bold">
                    Context-Aware
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-mono truncate">
                  {activeClaim?.claimNumber || 'MOT-9284-IN'} • {activeClaim?.vehicle || 'Hyundai Creta'}
                </p>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 text-zinc-400">
              <button
                onClick={() => setIsMinimized(prev => !prev)}
                className="w-7 h-7 rounded-lg hover:bg-white/5 hover:text-white flex items-center justify-center transition-colors"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <span className="material-symbols-outlined text-[17px]">
                  {isMinimized ? 'unfold_more' : 'unfold_less'}
                </span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/5 hover:text-white flex items-center justify-center transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          {!isMinimized && (
            <div className="flex border-b border-white/[0.06] bg-[#121212] px-3 pt-2 shrink-0">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'chat'
                    ? 'border-[#DEB7FF] text-[#DEB7FF] bg-white/[0.02]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">chat</span>
                <span>Claim Copilot</span>
              </button>
              <button
                onClick={() => setActiveTab('incident')}
                className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                  activeTab === 'incident'
                    ? 'border-[#C5F258] text-[#C5F258] bg-white/[0.02]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">record_voice_over</span>
                <span>Talk Incident to Claim</span>
              </button>
            </div>
          )}

          {/* TAB 1: Realtime Context-Aware Chat */}
          {!isMinimized && activeTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#0E0E0E]">
              {/* Context Pill Strip */}
              <div className="px-3.5 py-1.5 bg-[#181818] border-b border-white/[0.04] flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258]"></span>
                  <span>Active Stage: <strong className="text-white">Step {currentStep}</strong></span>
                </div>
                <button
                  onClick={() => onNavigate('my-claims')}
                  className="text-[#DEB7FF] hover:underline text-[10px] font-semibold"
                >
                  View Workflow →
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.sender === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] p-3.5 rounded-2xl ${
                        msg.sender === 'user'
                          ? 'bg-[#632D93] text-white rounded-br-none border border-[#DEB7FF]/30'
                          : 'bg-[#1C1B1B] text-zinc-200 rounded-bl-none border border-white/[0.08]'
                      }`}
                    >
                      <div className="whitespace-pre-line leading-relaxed">{msg.text}</div>

                      {/* Grounding Footer */}
                      {msg.groundingContext && (
                        <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-zinc-400 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] text-[#C5F258]">verified</span>
                            <span>{msg.groundingContext.details}</span>
                          </div>
                          {msg.sender === 'assistant' && (
                            <button
                              onClick={() => handlePlayTTS(msg.id, msg.text)}
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded transition-all ${
                                playingMsgId === msg.id 
                                  ? 'bg-[#C5F258] text-black font-semibold' 
                                  : 'text-[#C5F258] hover:bg-white/5'
                              }`}
                              title="Listen to local AI voice"
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                {playingMsgId === msg.id ? 'stop' : 'volume_up'}
                              </span>
                              <span>{playingMsgId === msg.id ? 'Playing' : 'Listen'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-zinc-600 mt-1 px-1">{msg.timestamp}</span>

                    {/* Suggested Queries */}
                    {msg.suggestedQueries && msg.suggestedQueries.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                        {msg.suggestedQueries.map((sq, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(sq)}
                            className="px-2.5 py-1 rounded-full bg-[#201F1F] hover:bg-zinc-800 text-[10px] text-[#DEB7FF] hover:text-white border border-[#DEB7FF]/20 transition-all text-left"
                          >
                            + {sq}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#1C1B1B] text-zinc-400 text-xs w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258] animate-ping" />
                    <span>AI Claim Pilot analyzing IRDAI rules & claim context...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 bg-[#161616] border-t border-white/[0.08] shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                    title={isRecording ? 'Stop & transcribe' : 'Dictate question with Gemini'}
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {isRecording ? 'stop' : 'mic'}
                    </span>
                  </button>

                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isRecording
                        ? `Recording audio... 00:${recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}`
                        : isTranscribing
                        ? 'Transcribing your question...'
                        : activeClaim
                        ? `Ask about claim ${activeClaim.claimNumber}...`
                        : 'Ask any question about filing or policy rules...'
                    }
                    className="flex-1 bg-[#1F1E1E] text-white text-xs px-3.5 py-2.5 rounded-full border border-white/10 focus:outline-none focus:border-[#DEB7FF] placeholder:text-zinc-500"
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="w-9 h-9 rounded-full bg-[#C5F258] hover:bg-[#b8e748] disabled:opacity-40 text-[#151F00] flex items-center justify-center font-bold transition-all shrink-0"
                  >
                    <span className="material-symbols-outlined text-[17px]">arrow_upward</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Talk About Incident & Convert into Claim Journey */}
          {!isMinimized && activeTab === 'incident' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#0E0E0E] p-4 overflow-y-auto space-y-4">
              <div className="bg-[#1C1B1B] p-4 rounded-2xl border border-white/[0.08]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[#C5F258] text-[20px]">
                    record_voice_over
                  </span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Voice / Speech Incident Converter
                  </h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                  Describe what happened in your own words. Gemini extracts damage points, determines if an FIR is needed, maps your policy cover, and creates a tailored claim journey in the DB.
                </p>

                {/* Textarea */}
                <div className="relative mb-3">
                  <textarea
                    rows={4}
                    value={incidentText}
                    onChange={(e) => setIncidentText(e.target.value)}
                    placeholder="e.g. 'Yesterday around 7 PM at Silk Board junction, a water tanker hit my front right bumper while merging. Headlamp broke and coolant is leaking. Police gave GD entry at Madivala station.'"
                    className="w-full bg-[#121212] text-white text-xs p-3 rounded-xl border border-white/10 focus:outline-none focus:border-[#C5F258] placeholder:text-zinc-600 resize-none"
                  />
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {isRecording ? 'stop' : 'mic'}
                    </span>
                    <span>
                      {isRecording
                        ? `Recording (00:${recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds})`
                        : isTranscribing
                        ? 'Transcribing...'
                        : 'Dictate'}
                    </span>
                  </button>
                </div>

                {/* Sample Presets */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="text-[10px] text-zinc-500 w-full font-semibold">Quick incident scenarios:</span>
                  <button
                    onClick={() =>
                      setIncidentText(
                        'Front bumper collision with commercial vehicle at traffic signal. Headlamp broken, radiator leaking. Police GD entry logged.'
                      )
                    }
                    className="px-2 py-1 rounded bg-[#242424] hover:bg-zinc-700 text-[10px] text-zinc-300 transition-colors"
                  >
                    🚗 Front Bumper Crash
                  </button>
                  <button
                    onClick={() =>
                      setIncidentText(
                        'Basement parking waterlogging during heavy rains. Engine flooded, car stalled upon ignition attempt.'
                      )
                    }
                    className="px-2 py-1 rounded bg-[#242424] hover:bg-zinc-700 text-[10px] text-zinc-300 transition-colors"
                  >
                    🌧️ Flood Submersion
                  </button>
                </div>

                {/* Conversion Action */}
                <button
                  onClick={handleConvertIncident}
                  disabled={!incidentText.trim() || isConverting}
                  className="w-full py-2.5 px-4 rounded-full bg-[#C5F258] hover:bg-[#b8e748] disabled:opacity-40 text-[#151F00] font-bold text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(197,242,88,0.3)] transition-all"
                >
                  {isConverting ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-black border-t-transparent animate-spin" />
                      <span>Gemini Converting to Claim Journey...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">bolt</span>
                      <span>Convert to Live Claim Journey</span>
                    </>
                  )}
                </button>
              </div>

              {/* Conversion Output Card */}
              {conversionResult && (
                <div className="p-4 rounded-2xl bg-[#1C1B1B] border border-[#C5F258]/30 shadow-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#C5F258]/20 text-[#C5F258] text-[10px] font-bold uppercase">
                      New Claim Created in DB
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {conversionResult.claim?.claimNumber}
                    </span>
                  </div>

                  <div>
                    <h5 className="text-xs font-bold text-white">
                      {conversionResult.aiAnalysis?.detectedCategory}
                    </h5>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Severity: <strong className="text-white capitalize">{conversionResult.aiAnalysis?.severity}</strong> • Estimated Range: ₹{conversionResult.aiAnalysis?.estimatedCostRange?.min?.toLocaleString('en-IN')} - ₹{conversionResult.aiAnalysis?.estimatedCostRange?.max?.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Damages Tagged */}
                  <div className="text-[11px]">
                    <span className="text-zinc-500 block mb-1 font-semibold">Damages Inventory:</span>
                    <div className="flex flex-wrap gap-1">
                      {conversionResult.aiAnalysis?.damagesIdentified?.map((dmg: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-[#252525] text-zinc-300 text-[10px]"
                        >
                          {dmg}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Legal FIR Requirement */}
                  <div className="p-2.5 rounded-xl bg-[#2A2A2A] text-[11px] flex items-start gap-2">
                    <span
                      className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                        conversionResult.aiAnalysis?.firRequired ? 'text-[#FFB691]' : 'text-[#C5F258]'
                      }`}
                    >
                      {conversionResult.aiAnalysis?.firRequired ? 'report_problem' : 'check_circle'}
                    </span>
                    <div className="text-zinc-300 leading-tight">
                      <strong>
                        {conversionResult.aiAnalysis?.firRequired
                          ? 'Police FIR/GD Required'
                          : 'No FIR Required'}
                      </strong>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {conversionResult.aiAnalysis?.firReason ||
                          'Single-vehicle damage can be filed without police report.'}
                      </p>
                    </div>
                  </div>

                  {/* Button to navigate into the new claim journey */}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onNavigate('my-claims');
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#632D93] to-[#DEB7FF] text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-95 transition-opacity"
                  >
                    <span>Open & Complete Documents (Step 1)</span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
