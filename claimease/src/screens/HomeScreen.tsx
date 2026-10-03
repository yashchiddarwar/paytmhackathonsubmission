import React from 'react';
import { ScreenType } from '../types';
import { DBClaim } from '../../server/db';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onResumeClaim: () => void;
  onSelectCategory?: (category: string) => void;
  activeClaim?: DBClaim | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  onResumeClaim,
  onSelectCategory,
  activeClaim
}) => {
  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto gap-8 pb-12 animate-fade-in">
      {/* Top Welcome Title with Ambient Chromatic Glow */}
      <div className="relative pt-2">
        <div className="absolute -top-10 right-10 w-96 h-96 bg-gradient-to-bl from-[#BC84EE]/10 via-[#C5F258]/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
        
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
            <span>Hi there</span>
            <span>👋</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-display">
            Let's make your claim simple.
          </h1>
          <p className="text-zinc-400 text-base md:text-lg mt-1 max-w-3xl">
            Explore, prepare, verify and submit — with AI support when you need it.
          </p>
        </div>
      </div>

      {/* 4 Hero Action Cards in 4 distinct high-contrast colors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Explore Claims (Lime) */}
        <div 
          onClick={() => onNavigate('explore-claims')}
          className="p-6 rounded-3xl bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] flex flex-col justify-between h-64 cursor-pointer transition-all hover:-translate-y-1 shadow-[0_8px_30px_-6px_rgba(197,242,88,0.35)] group relative overflow-hidden"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-black/10 flex items-center justify-center mb-4 text-[#151F00]">
              <span className="material-symbols-outlined text-[24px]">directions_car</span>
            </div>
            <h3 className="text-xl font-bold font-display leading-tight mb-2">Explore Claims</h3>
            <p className="text-xs text-[#263500] font-medium leading-relaxed">
              Browse claim types and understand what you need.
            </p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-black/10">
            <span className="text-[11px] font-bold tracking-wider uppercase">32 Guides</span>
            <div className="w-9 h-9 rounded-full bg-black text-[#C5F258] flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </div>
        </div>

        {/* Card 2: Document Library (Purple) */}
        <div 
          onClick={() => onNavigate('document-library')}
          className="p-6 rounded-3xl bg-[#DEB7FF] hover:bg-[#d4a4ff] text-[#2D0050] flex flex-col justify-between h-64 cursor-pointer transition-all hover:-translate-y-1 shadow-[0_8px_30px_-6px_rgba(222,183,255,0.35)] group relative overflow-hidden"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-black/10 flex items-center justify-center mb-4 text-[#2D0050]">
              <span className="material-symbols-outlined text-[24px]">folder_open</span>
            </div>
            <h3 className="text-xl font-bold font-display leading-tight mb-2">Document Library</h3>
            <p className="text-xs text-[#490B78] font-medium leading-relaxed">
              Understand every document before you upload it.
            </p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-black/10">
            <span className="text-[11px] font-bold tracking-wider uppercase">Valid Samples</span>
            <div className="w-9 h-9 rounded-full bg-black text-[#DEB7FF] flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </div>
        </div>

        {/* Card 3: Check My Document (Warm Orange / Peach) */}
        <div 
          onClick={() => onNavigate('check-document')}
          className="p-6 rounded-3xl bg-[#FFB691] hover:bg-[#ffa77a] text-[#4A1800] flex flex-col justify-between h-64 cursor-pointer transition-all hover:-translate-y-1 shadow-[0_8px_30px_-6px_rgba(255,182,145,0.35)] group relative overflow-hidden"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-black/10 flex items-center justify-center mb-4 text-[#4A1800]">
              <span className="material-symbols-outlined text-[24px]">document_scanner</span>
            </div>
            <h3 className="text-xl font-bold font-display leading-tight mb-2">Check My Document</h3>
            <p className="text-xs text-[#6B2800] font-medium leading-relaxed">
              Get instant AI feedback on quality, completeness and potential issues.
            </p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-black/10">
            <span className="text-[11px] font-bold tracking-wider uppercase">Diagnostic OCR</span>
            <div className="w-9 h-9 rounded-full bg-black text-[#FFB691] flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </div>
        </div>

        {/* Card 4: Ask AI Claim Pilot (Pale Iris / Lilac) */}
        <div 
          onClick={() => onNavigate('ai-claim-pilot')}
          className="p-6 rounded-3xl bg-[#FFDBCB] hover:bg-[#ffcfba] text-[#552000] flex flex-col justify-between h-64 cursor-pointer transition-all hover:-translate-y-1 shadow-[0_8px_30px_-6px_rgba(255,219,203,0.35)] group relative overflow-hidden"
        >
          <div>
            <div className="w-11 h-11 rounded-2xl bg-black/10 flex items-center justify-center mb-4 text-[#552000]">
              <span className="material-symbols-outlined text-[24px]">auto_awesome</span>
            </div>
            <h3 className="text-xl font-bold font-display leading-tight mb-2">Ask AI Claim Pilot</h3>
            <p className="text-xs text-[#793100] font-medium leading-relaxed">
              Get answers in natural language using your live claim context.
            </p>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-black/10">
            <span className="text-[11px] font-bold tracking-wider uppercase">24/7 Co-Pilot</span>
            <div className="w-9 h-9 rounded-full bg-black text-[#FFDBCB] flex items-center justify-center group-hover:translate-x-1 transition-transform">
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </div>
          </div>
        </div>
      </div>

      {/* In-Flight Draft / Brand New Account Ribbon */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#1C1B1B] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#DEB7FF]/15 border border-[#DEB7FF]/30 flex items-center justify-center text-[#DEB7FF] shrink-0">
            <span className="material-symbols-outlined text-[24px]">
              {activeClaim ? 'car_crash' : 'verified_user'}
            </span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-white">
                {activeClaim ? activeClaim.policyType : 'Start Your First Insurance Claim'}
              </span>
              {activeClaim && (
                <span className="font-mono text-xs text-[#C5F258] font-bold">
                  {activeClaim.claimNumber}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeClaim ? 'bg-[#FF823A]/15 text-[#FF823A] border border-[#FF823A]/30' : 'bg-[#C5F258]/15 text-[#C5F258] border border-[#C5F258]/30'
              }`}>
                {activeClaim ? (activeClaim.status === 'ready' ? 'Ready to File' : 'In Progress') : 'Brand New Account'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${activeClaim ? 'bg-[#FF823A]' : 'bg-[#C5F258]'}`}></span>
              <span>
                {activeClaim
                  ? `${activeClaim.vehicle} • Step ${activeClaim.currentStep || 2} Verification • Live in Database`
                  : 'Zero claims filed • Verified policies and DigiLocker linked • Dictate an incident to start'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          {activeClaim && (
            <div className="text-right hidden md:block">
              <span className="text-[11px] text-zinc-400 uppercase tracking-wider block">Claim Readiness</span>
              <span className="text-sm font-bold text-[#C5F258]">{activeClaim.progressPercent}% Complete</span>
            </div>
          )}
          <button 
            onClick={() => onNavigate('check-document')}
            className="px-4 py-2.5 rounded-full bg-[#1C1B1B] hover:bg-zinc-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0 border border-white/10 shadow-md"
            title="Test automated AI forensic pre-audit on 1-2 demo documents"
          >
            <span className="material-symbols-outlined text-[15px] text-[#C5F258]">fact_check</span>
            <span>AI Document Check</span>
          </button>
          <button 
            onClick={() => onNavigate('ai-claim-pilot')}
            className="px-4 py-2.5 rounded-full bg-[#632D93] hover:bg-[#7938b3] text-[#DEB7FF] font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0 border border-[#DEB7FF]/30 shadow-md"
            title="Convert voice or text incident into a new claim"
          >
            <span className="material-symbols-outlined text-[15px]">record_voice_over</span>
            <span>Dictate Incident</span>
          </button>
          <button 
            onClick={() => {
              if (activeClaim) onResumeClaim();
              else onNavigate('ai-claim-pilot');
            }}
            className="px-5 py-2.5 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-xs transition-colors flex items-center gap-2 shrink-0 shadow-md"
          >
            <span>{activeClaim ? 'Resume Claim' : 'Start First Claim Journey'}</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Common Claim Types Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white font-display">Common claim types</h2>
            <span className="text-xs text-zinc-400">Select to explore</span>
          </div>
          <button 
            onClick={() => onNavigate('explore-claims')}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>View all</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Motor */}
          <div 
            onClick={() => {
              onSelectCategory?.('Motor');
              onNavigate('explore-claims');
            }}
            className="p-4 rounded-2xl bg-[#1C1B1B] hover:bg-[#252424] border border-white/[0.08] hover:border-[#C5F258]/50 transition-all cursor-pointer group flex flex-col justify-between h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C5F258]/10 flex items-center justify-center text-[#C5F258] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">directions_car</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-[#C5F258] transition-colors">Motor Insurance</h4>
              <p className="text-[11px] text-[#C5F258] font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258]"></span> Most Popular
              </p>
            </div>
          </div>

          {/* Health */}
          <div 
            onClick={() => {
              onSelectCategory?.('Health');
              onNavigate('explore-claims');
            }}
            className="p-4 rounded-2xl bg-[#1C1B1B] hover:bg-[#252424] border border-white/[0.08] hover:border-[#DEB7FF]/50 transition-all cursor-pointer group flex flex-col justify-between h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-[#DEB7FF]/10 flex items-center justify-center text-[#DEB7FF] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">local_hospital</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-[#DEB7FF] transition-colors">Health Insurance</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">Cashless & Reimburse</p>
            </div>
          </div>

          {/* Travel */}
          <div 
            onClick={() => {
              onSelectCategory?.('Travel');
              onNavigate('explore-claims');
            }}
            className="p-4 rounded-2xl bg-[#1C1B1B] hover:bg-[#252424] border border-white/[0.08] hover:border-[#FFB691]/50 transition-all cursor-pointer group flex flex-col justify-between h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFB691]/10 flex items-center justify-center text-[#FFB691] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">flight_takeoff</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-[#FFB691] transition-colors">Travel Insurance</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">Delays & Baggage</p>
            </div>
          </div>

          {/* Life */}
          <div 
            onClick={() => {
              onSelectCategory?.('Life');
              onNavigate('explore-claims');
            }}
            className="p-4 rounded-2xl bg-[#1C1B1B] hover:bg-[#252424] border border-white/[0.08] hover:border-white/30 transition-all cursor-pointer group flex flex-col justify-between h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">verified_user</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white transition-colors">Life Insurance</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">Term & Policy Claim</p>
            </div>
          </div>

          {/* Personal Accident */}
          <div 
            onClick={() => {
              onSelectCategory?.('Personal Accident');
              onNavigate('explore-claims');
            }}
            className="p-4 rounded-2xl bg-[#1C1B1B] hover:bg-[#252424] border border-white/[0.08] hover:border-white/30 transition-all cursor-pointer group flex flex-col justify-between h-36"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">accessible</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white transition-colors">Personal Accident</h4>
              <p className="text-[11px] text-zinc-400 mt-0.5">Disability & Trauma</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Section: How ClaimEase Protects Your Payout (Left) + Confused by policy wording? (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (8 cols): Payout Protection */}
        <div className="lg:col-span-8 p-6 rounded-3xl bg-[#161616] border border-white/[0.08] flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[11px] text-[#C5F258] uppercase font-bold tracking-wider">Instant Guidance</span>
                <h3 className="text-xl font-bold text-white font-display mt-0.5">How ClaimEase Protects Your Payout</h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs font-medium">
                • 4-Tier Analysis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-4">
              <div className="p-4 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[#C5F258]">
                  <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                </div>
                <h5 className="text-sm font-bold text-white">1. Blur & Legibility</h5>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Catches low-resolution police reports and unreadable stamps before insurer rejection.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[#DEB7FF]">
                  <span className="material-symbols-outlined text-[18px]">compare_arrows</span>
                </div>
                <h5 className="text-sm font-bold text-white">2. Cross-Document Sync</h5>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Flags discrepancies between FIR accident dates and hospital admission timestamps.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[#C5F258]">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </div>
                <h5 className="text-sm font-bold text-white">3. Readiness Score</h5>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Delivers a transparent submission score and step-by-step resolution suggestions.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#C5F258]/15 text-[#C5F258] font-bold flex items-center justify-center text-xs">
                98%
              </div>
              <span className="text-xs text-zinc-300">First-time acceptance rate on verified submissions</span>
            </div>
            <button 
              onClick={() => onNavigate('check-document')}
              className="text-xs text-white hover:text-[#C5F258] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Run diagnostics on a file</span>
              <span className="material-symbols-outlined text-[15px]">north_east</span>
            </button>
          </div>
        </div>

        {/* Right Column (4 cols): AI Assistant Box */}
        <div className="lg:col-span-4 p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] flex flex-col justify-between shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-[#DEB7FF]/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-[#DEB7FF] uppercase font-bold tracking-wider">AI Assistant</span>
              <span className="material-symbols-outlined text-[#DEB7FF] text-[20px]">smart_toy</span>
            </div>
            <h3 className="text-lg font-bold text-white font-display mb-2">Confused by policy wording?</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ask questions like <em className="text-zinc-300 not-italic">"Is towing covered under third-party?"</em> or <em className="text-zinc-300 not-italic">"What is an FIR duplicate copy?"</em>
            </p>
          </div>

          <div className="pt-6">
            <button 
              onClick={() => onNavigate('ai-claim-pilot')}
              className="w-full py-3.5 px-4 rounded-full bg-[#DEB7FF] hover:bg-[#d1a3fc] text-[#2D0050] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_-2px_rgba(222,183,255,0.3)]"
            >
              <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
              <span>Start conversation</span>
            </button>
            <div className="flex items-center justify-center gap-2 mt-3 text-[11px] text-zinc-500">
              <span>Private</span>
              <span>•</span>
              <span>Encrypted</span>
              <span>•</span>
              <span>Instant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
