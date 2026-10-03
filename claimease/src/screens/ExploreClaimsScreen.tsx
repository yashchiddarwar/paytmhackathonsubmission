import React, { useState } from 'react';
import { ScreenType, ClaimDocument } from '../types';
import { MOCK_DOCUMENTS } from '../data/mockData';

interface ExploreClaimsScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectDocument: (doc: ClaimDocument) => void;
  onStartClaimJourney: () => void;
}

export const ExploreClaimsScreen: React.FC<ExploreClaimsScreenProps> = ({
  onNavigate,
  onSelectDocument,
  onStartClaimJourney
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScenario, setSelectedScenario] = useState('accident-damage');

  const firDoc = MOCK_DOCUMENTS.find(d => d.id === 'doc-fir') || MOCK_DOCUMENTS[0];
  const dlDoc = MOCK_DOCUMENTS.find(d => d.id === 'doc-dl') || MOCK_DOCUMENTS[1];
  const rcDoc = MOCK_DOCUMENTS.find(d => d.id === 'doc-rc') || MOCK_DOCUMENTS[2];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.toLowerCase().includes('theft') || searchQuery.toLowerCase().includes('steal')) {
      setSelectedScenario('theft');
    } else if (searchQuery.toLowerCase().includes('hospital') || searchQuery.toLowerCase().includes('medical')) {
      setSelectedScenario('hospitalization');
    } else if (searchQuery.toLowerCase().includes('flight') || searchQuery.toLowerCase().includes('baggage')) {
      setSelectedScenario('flight-cancellation');
    } else {
      setSelectedScenario('accident-damage');
    }
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto gap-8 pb-12 animate-fade-in">
      {/* Page Header & Discovery Search */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-display">
            Explore Claims
          </h1>
          <p className="text-zinc-400 text-base md:text-lg mt-1.5">
            Tell us what happened. We'll show you what to do next.
          </p>
        </div>

        {/* Prominent Discovery Input */}
        <div className="p-4 md:p-5 rounded-2xl bg-[#131313] border border-white/[0.08] shadow-xl">
          <label className="block text-xs uppercase tracking-wider text-zinc-400 font-bold mb-2.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C5F258] text-[18px]">help_outline</span>
            <span>What happened?</span>
          </label>
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-[20px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. My car was damaged in an accident"
                className="w-full bg-[#1A1A1A] border border-white/[0.08] focus:border-[#C5F258] focus:ring-1 focus:ring-[#C5F258] rounded-xl pl-11 pr-4 py-3 text-white placeholder-zinc-500 text-sm outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-sm shadow-[0_4px_20px_-2px_rgba(197,242,88,0.3)] transition-all flex items-center justify-center gap-2 shrink-0"
            >
              <span>Find my claim</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Two-Column Scenario Discovery & Journey Mapping Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / CENTER COLUMN: Browse Claim Types & Scenarios (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#C5F258] text-[22px]">category</span>
              <h2 className="text-xl font-bold text-white font-display">Browse claim types</h2>
            </div>
            <span className="text-zinc-400 text-xs">8 scenarios available</span>
          </div>

          {/* Category 1: Motor Insurance (Featured) */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="material-symbols-outlined text-[#C5F258] text-[18px]">directions_car</span>
              <span className="text-xs tracking-wider uppercase font-bold text-white">Motor Insurance</span>
              <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold uppercase tracking-wider">
                Featured
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Scenario 1: Accident Damage (Active / Selected) */}
              <div
                onClick={() => setSelectedScenario('accident-damage')}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  selectedScenario === 'accident-damage'
                    ? 'bg-[#171A12] border-2 border-[#C5F258] shadow-[0_0_24px_-6px_rgba(197,242,88,0.25)]'
                    : 'bg-[#131313] border border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C5F258] animate-pulse"></span>
                    <h3 className="text-base font-bold text-white">Accident Damage</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C5F258] text-[#151F00] text-xs font-bold">
                    Selected MVP
                  </span>
                </div>
                <p className="text-sm text-zinc-400 pl-5">Your vehicle was damaged in an accident.</p>
              </div>

              {/* Scenario 2: Theft */}
              <div
                onClick={() => setSelectedScenario('theft')}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  selectedScenario === 'theft'
                    ? 'bg-[#171A12] border-2 border-[#C5F258] shadow-[0_0_24px_-6px_rgba(197,242,88,0.25)]'
                    : 'bg-[#131313] border border-white/[0.08] hover:border-white/20 hover:bg-[#1A1A1A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-white">Theft</h3>
                  <span className="material-symbols-outlined text-zinc-400 text-[18px]">chevron_right</span>
                </div>
                <p className="text-sm text-zinc-400">Your insured vehicle has been stolen.</p>
              </div>

              {/* Scenario 3: Third-Party Damage */}
              <div
                onClick={() => setSelectedScenario('third-party')}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  selectedScenario === 'third-party'
                    ? 'bg-[#171A12] border-2 border-[#C5F258] shadow-[0_0_24px_-6px_rgba(197,242,88,0.25)]'
                    : 'bg-[#131313] border border-white/[0.08] hover:border-white/20 hover:bg-[#1A1A1A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-white">Third-Party Damage</h3>
                  <span className="material-symbols-outlined text-zinc-400 text-[18px]">chevron_right</span>
                </div>
                <p className="text-sm text-zinc-400">Your vehicle caused or received third-party damage.</p>
              </div>
            </div>
          </div>

          {/* Category 2: Health Insurance */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="material-symbols-outlined text-[#DEB7FF] text-[18px]">local_hospital</span>
              <span className="text-xs tracking-wider uppercase font-bold text-zinc-300">Health Insurance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setSelectedScenario('hospitalization')}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  selectedScenario === 'hospitalization'
                    ? 'bg-[#1e1428] border-2 border-[#DEB7FF]'
                    : 'bg-[#131313] border border-white/[0.08] hover:border-[#DEB7FF]/40 hover:bg-[#1A1A1A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-white">Hospitalization</h3>
                  <span className="material-symbols-outlined text-zinc-400 text-[18px]">chevron_right</span>
                </div>
                <p className="text-xs text-zinc-400">Claim expenses from an eligible hospital stay.</p>
              </div>

              <div
                onClick={() => setSelectedScenario('day-care')}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  selectedScenario === 'day-care'
                    ? 'bg-[#1e1428] border-2 border-[#DEB7FF]'
                    : 'bg-[#131313] border border-white/[0.08] hover:border-[#DEB7FF]/40 hover:bg-[#1A1A1A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-semibold text-white">Day-Care Procedure</h3>
                  <span className="material-symbols-outlined text-zinc-400 text-[18px]">chevron_right</span>
                </div>
                <p className="text-xs text-zinc-400">Claim an eligible procedure that doesn't require overnight admission.</p>
              </div>
            </div>
          </div>

          {/* Category 3: Travel Insurance */}
          <div className="flex flex-col gap-3 pt-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="material-symbols-outlined text-[#FF823A] text-[18px]">flight</span>
              <span className="text-xs tracking-wider uppercase font-bold text-zinc-300">Travel Insurance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setSelectedScenario('flight-cancellation')}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  selectedScenario === 'flight-cancellation'
                    ? 'bg-[#291710] border-2 border-[#FF823A]'
                    : 'bg-[#131313] border border-white/[0.08] hover:border-[#FF823A]/40 hover:bg-[#1A1A1A]'
                }`}
              >
                <h3 className="text-sm font-semibold text-white mb-1">Flight Cancellation</h3>
                <p className="text-xs text-zinc-400">Claim eligible expenses from a cancelled trip.</p>
              </div>

              <div
                onClick={() => setSelectedScenario('lost-baggage')}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  selectedScenario === 'lost-baggage'
                    ? 'bg-[#291710] border-2 border-[#FF823A]'
                    : 'bg-[#131313] border border-white/[0.08] hover:border-[#FF823A]/40 hover:bg-[#1A1A1A]'
                }`}
              >
                <h3 className="text-sm font-semibold text-white mb-1">Lost Baggage</h3>
                <p className="text-xs text-zinc-400">Get guidance for baggage loss or delay.</p>
              </div>

              <div
                onClick={() => setSelectedScenario('medical-emergency')}
                className={`p-4 rounded-xl transition-all cursor-pointer ${
                  selectedScenario === 'medical-emergency'
                    ? 'bg-[#291710] border-2 border-[#FF823A]'
                    : 'bg-[#131313] border border-white/[0.08] hover:border-[#FF823A]/40 hover:bg-[#1A1A1A]'
                }`}
              >
                <h3 className="text-sm font-semibold text-white mb-1">Medical Emergency</h3>
                <p className="text-xs text-zinc-400">Understand what to prepare after an emergency abroad.</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Claim Journey & Guidance Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Guidance Card */}
          <div className="rounded-2xl bg-[#131313] border border-white/[0.08] p-6 flex flex-col gap-6 shadow-xl">
            {/* Header */}
            <div className="border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-[#C5F258]"></span>
                <span className="text-xs tracking-wider uppercase font-bold text-[#C5F258]">
                  Motor Insurance — Accident Damage
                </span>
              </div>
              <h3 className="text-xl font-bold text-white font-display">Here's what your claim journey looks like.</h3>
              <p className="text-xs text-zinc-400 mt-1">A step-by-step roadmap tailored to accident damage claims.</p>
            </div>

            {/* 6-Stage Claim Journey Stepper */}
            <div>
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 block mb-3">Claim Journey</span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <div className="flex flex-col items-center p-2 rounded-lg bg-[#C5F258] text-[#151F00] text-center shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider">01</span>
                  <span className="text-[11px] font-extrabold leading-tight">Report</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-[#1A1A1A] border border-white/[0.08] text-white text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">02</span>
                  <span className="text-[11px] font-semibold leading-tight">Understand</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-[#1A1A1A] border border-white/[0.08] text-white text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">03</span>
                  <span className="text-[11px] font-semibold leading-tight">Prepare</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-[#1A1A1A] border border-white/[0.08] text-white text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">04</span>
                  <span className="text-[11px] font-semibold leading-tight">Verify</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-[#1A1A1A] border border-white/[0.08] text-white text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">05</span>
                  <span className="text-[11px] font-semibold leading-tight">Submit</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-[#1A1A1A] border border-white/[0.08] text-white text-center">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">06</span>
                  <span className="text-[11px] font-semibold leading-tight">Track</span>
                </div>
              </div>
            </div>

            {/* Section: Common Documents */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider font-bold text-zinc-400">Common documents</span>
                <span className="text-[11px] text-zinc-400">3 key requirements</span>
              </div>

              {/* Document Pointer 1: FIR */}
              <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-between hover:border-white/[0.15] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#5A6E28]/40 flex items-center justify-center text-[#C5F258] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">description</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-white font-semibold truncate">FIR (First Information Report)</span>
                    <span className="text-xs text-zinc-400">Why it's needed</span>
                  </div>
                </div>
                <button
                  onClick={() => onSelectDocument(firDoc)}
                  className="text-[#C5F258] hover:underline text-xs font-semibold inline-flex items-center gap-0.5 shrink-0 ml-2"
                >
                  <span>View details</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              {/* Document Pointer 2: DL */}
              <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-between hover:border-white/[0.15] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#632D93]/40 flex items-center justify-center text-[#DEB7FF] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-white font-semibold truncate">Driving Licence</span>
                    <span className="text-xs text-zinc-400">Why it's needed</span>
                  </div>
                </div>
                <button
                  onClick={() => onSelectDocument(dlDoc)}
                  className="text-[#C5F258] hover:underline text-xs font-semibold inline-flex items-center gap-0.5 shrink-0 ml-2"
                >
                  <span>View details</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              {/* Document Pointer 3: RC */}
              <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-white/[0.06] flex items-center justify-between hover:border-white/[0.15] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#a84700]/30 flex items-center justify-center text-[#FF823A] shrink-0">
                    <span className="material-symbols-outlined text-[18px]">directions_car</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm text-white font-semibold truncate">Vehicle Registration (RC)</span>
                    <span className="text-xs text-zinc-400">Why it's needed</span>
                  </div>
                </div>
                <button
                  onClick={() => onSelectDocument(rcDoc)}
                  className="text-[#C5F258] hover:underline text-xs font-semibold inline-flex items-center gap-0.5 shrink-0 ml-2"
                >
                  <span>View details</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Launch Journey CTA */}
            <button
              onClick={onStartClaimJourney}
              className="w-full py-3.5 px-6 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] font-bold text-sm shadow-[0_4px_20px_-2px_rgba(197,242,88,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <span>Begin Accident Damage Claim</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>

          {/* Contextual AI Assistance Card */}
          <div className="p-5 rounded-2xl bg-[#131313] border border-[#DEB7FF]/30 flex flex-col gap-3.5 relative overflow-hidden shadow-xl">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#DEB7FF]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#632D93]/50 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[#DEB7FF] text-[22px]">auto_awesome</span>
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Ask AI Claim Pilot</h4>
                <p className="text-xs text-zinc-400">Not sure which claim applies? Describe what happened.</p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('ai-claim-pilot')}
              className="w-full py-2.5 px-4 rounded-full bg-[#DEB7FF] hover:bg-[#ab6de2] text-[#2D0050] font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_16px_-2px_rgba(188,132,238,0.35)] transition-all"
            >
              <span>Start Claim Pilot</span>
              <span className="material-symbols-outlined text-[18px]">spark</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
