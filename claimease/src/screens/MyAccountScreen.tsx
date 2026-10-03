import React, { useState, useEffect } from 'react';
import { ScreenType } from '../types';
import { resetDatabase, fetchDbStatus, clearAllClaims, seedSampleClaim } from '../services/api';

interface MyAccountScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onResumeClaim: () => void;
  onDbReset?: () => void;
}

export const MyAccountScreen: React.FC<MyAccountScreenProps> = ({
  onNavigate,
  onResumeClaim,
  onDbReset
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'policies' | 'vaults' | 'copilot' | 'security' | 'billing'>('profile');

  // Interactive Vault Toggles
  const [digiLockerSynced, setDigiLockerSynced] = useState(true);
  const [mParivahanSynced, setMParivahanSynced] = useState(true);
  const [abhaSynced, setAbhaSynced] = useState(true);
  const [nicrSynced, setNicrSynced] = useState(true);

  // Copilot Controls
  const [claimMemory, setClaimMemory] = useState(true);
  const [preFlightOcr, setPreFlightOcr] = useState(true);
  const [surveyorModeling, setSurveyorModeling] = useState(true);

  // Database State
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const refreshStatus = async () => {
    const info = await fetchDbStatus();
    setDbInfo(info);
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleResetDb = async () => {
    setIsResettingDb(true);
    try {
      await resetDatabase();
      await refreshStatus();
      setResetMessage('Database restored to canonical state.');
      if (onDbReset) onDbReset();
      setTimeout(() => setResetMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to reset DB');
    } finally {
      setIsResettingDb(false);
    }
  };

  const handleWipeAllClaims = async () => {
    setIsResettingDb(true);
    try {
      await clearAllClaims();
      await refreshStatus();
      setResetMessage('✨ All claim data deleted. Account is now completely brand new.');
      if (onDbReset) onDbReset();
      setTimeout(() => setResetMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to clear claims');
    } finally {
      setIsResettingDb(false);
    }
  };

  const handleSeedSample = async () => {
    setIsResettingDb(true);
    try {
      await seedSampleClaim();
      await refreshStatus();
      setResetMessage('✨ Sample claim MOT-8841-IN seeded for testing.');
      if (onDbReset) onDbReset();
      setTimeout(() => setResetMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to seed sample claim');
    } finally {
      setIsResettingDb(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Overview & Profile' },
    { id: 'policies', label: 'Linked Policies (3)' },
    { id: 'vaults', label: 'Government ID Vault' },
    { id: 'copilot', label: 'AI Copilot Preferences' },
    { id: 'security', label: 'Security & Audit Logs' },
    { id: 'billing', label: 'Billing & Subscriptions' },
  ] as const;

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto gap-8 pb-12 animate-fade-in">
      {/* Top Navigation & Status Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">Home</button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-zinc-300">My Account</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-white font-semibold">Profile & Security Settings</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1B1B] border border-white/[0.08]">
          <span className="w-2 h-2 rounded-full bg-[#C5F258] shadow-[0_0_8px_#c5f258]"></span>
          <span className="text-xs font-semibold text-white">Aadhaar e-KYC Verified • Tier 1 High Trust</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-display">
              My Account & Vault
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#632D93]/60 text-[#DEB7FF] border border-[#DEB7FF]/30 text-xs font-bold font-mono">
              VAULT V2.4
            </span>
          </div>
          <p className="text-zinc-400 text-sm md:text-base mt-2 max-w-3xl leading-relaxed">
            Manage your verified personal identity, linked insurance policies, DigiLocker credentials, and cryptographic audit privacy.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => alert('Account profile & vault data exported in encrypted JSON/PDF format.')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1C1B1B] hover:bg-zinc-800 text-white border border-white/10 text-xs font-semibold transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Export Account Data (JSON/PDF)</span>
          </button>
          <button
            onClick={() => alert('DigiLocker vault refreshed successfully. 3 documents updated.')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] text-xs font-bold transition-all shadow-[0_4px_20px_-4px_rgba(197,242,88,0.35)]"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            <span>Sync DigiLocker Vault</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mt-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#C5F258] text-[#151F00] font-bold shadow-sm'
                : 'bg-[#1C1B1B] text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): User Profile & Vaults */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* User Profile & KYC Card */}
          <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] flex flex-col gap-6 relative overflow-hidden shadow-xl">
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#C5F258]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-[#632D93] border border-[#DEB7FF]/40 flex items-center justify-center text-[#DEB7FF] text-xl font-bold">
                    YK
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#131313] flex items-center justify-center">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#C5F258] flex items-center justify-center text-[#151F00] text-[10px] font-bold">
                      ✓
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white font-display">Yash Kapoor</h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                      Pro Member
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">yash.kapoor@example.com</p>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-300">
                    <span className="font-mono">+91 98765 43210</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C5F258]/10 text-[#C5F258] text-[10px]">
                      <span className="material-symbols-outlined text-[12px]">verified</span> Verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-xs text-zinc-300">
                  <span className="material-symbols-outlined text-[15px] text-[#C5F258]">workspace_premium</span>
                  <span>ClaimEase Pro • Member since Jun 2023</span>
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => alert('Profile update modal opened.')}
                    className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
                  >
                    Edit Details
                  </button>
                  <button 
                    onClick={() => alert('Aadhaar OTP triggered to +91 98765 43210.')}
                    className="px-3.5 py-1.5 rounded-full bg-[#C5F258]/20 hover:bg-[#C5F258]/30 text-[#C5F258] text-xs font-bold transition-all"
                  >
                    Re-verify KYC
                  </button>
                </div>
              </div>
            </div>

            {/* Statutory Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04] flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">IRDAI Central KYC</span>
                <span className="text-xs font-bold text-white">Compliant</span>
                <span className="text-[11px] text-zinc-400 font-mono">CKYC #8920194819</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04] flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Aadhaar Linked</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white font-mono">•••• 9214</span>
                  <span className="material-symbols-outlined text-[14px] text-[#C5F258]">verified_user</span>
                </div>
                <span className="text-[11px] text-zinc-400">Offline XML e-KYC Verified</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04] flex flex-col gap-1">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">PAN Linked</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white font-mono">ABCDE1234F</span>
                  <span className="material-symbols-outlined text-[14px] text-[#C5F258]">check_circle</span>
                </div>
                <span className="text-[11px] text-zinc-400">NSDL Tax Records Matched</span>
              </div>
            </div>
          </div>

          {/* Active & Linked Policies */}
          <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C5F258]/15 flex items-center justify-center text-[#C5F258]">
                  <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">Linked Policies</h3>
                  <p className="text-xs text-zinc-400">3 Active insurance contracts under continuous AI monitoring</p>
                </div>
              </div>
              <button
                onClick={() => alert('Add policy modal opened. Fetching policy via DigiLocker...')}
                className="px-3.5 py-1.5 rounded-full bg-[#C5F258]/15 hover:bg-[#C5F258]/25 text-[#C5F258] text-xs font-bold transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add Policy</span>
              </button>
            </div>

            <div className="space-y-3">
              {/* Policy 1: HDFC ERGO (In Progress Claim) */}
              <div className="p-4 rounded-2xl bg-[#201F1F] border border-[#C5F258]/30 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF823A] animate-pulse"></span>
                    <span className="text-sm font-bold text-white">HDFC ERGO Comprehensive Private Car</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                      MOT-9284-IN
                    </span>
                  </div>
                  <button
                    onClick={onResumeClaim}
                    className="px-2.5 py-0.5 rounded-full bg-[#FF823A]/20 text-[#FF823A] text-xs font-bold hover:bg-[#FF823A]/30 transition-colors"
                  >
                    In-Flight Claim #CLM-9284-01 →
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-400 pt-1">
                  <div>Vehicle: <span className="text-white font-semibold">2022 Hyundai Creta SX(O)</span></div>
                  <div>Registration: <span className="text-white font-mono font-semibold">DL 01 AB 8392</span></div>
                  <div className="flex items-center gap-1 text-[#C5F258]">
                    <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                    <span>92 Cashless Garages nearby</span>
                  </div>
                </div>
              </div>

              {/* Policy 2: Care Health */}
              <div className="p-4 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C5F258]"></span>
                    <span className="text-sm font-bold text-white">Care Health Supreme Family Floater</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                      HLT-4491-DEL
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                    Active • Zero Claims Active
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-400 pt-1">
                  <div>Insured: <span className="text-white font-semibold">3 Family Members</span></div>
                  <div>Sum Insured: <span className="text-[#C5F258] font-bold">₹15,00,000</span></div>
                  <div className="text-zinc-400">Pre-auth direct webhook</div>
                </div>
              </div>

              {/* Policy 3: Tata AIG */}
              <div className="p-4 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col gap-3 opacity-75 hover:opacity-100 transition-opacity">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-500"></span>
                    <span className="text-sm font-bold text-white">Tata AIG Domestic Travel Guard</span>
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                      TRV-8820-24
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[10px]">
                    Settled Claim Archive
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-zinc-400 pt-1">
                  <div>Coverage: <span className="text-zinc-200">Flight & Baggage Delay</span></div>
                  <div>Validity: <span className="text-zinc-200">Completed (2024)</span></div>
                  <div>Claim #SET-1029 Paid (₹8,400)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Government & Identity Vaults */}
          <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#632D93] flex items-center justify-center text-[#DEB7FF]">
                  <span className="material-symbols-outlined text-[20px]">account_balance</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">Government & Identity Vaults</h3>
                  <p className="text-xs text-zinc-400">Direct API bridges to state repositories for instant evidence fetch</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-[#C5F258]/10 text-[#C5F258] text-[10px] font-bold">
                All 4 Connected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* DigiLocker */}
              <div className="p-4 rounded-2xl bg-[#201F1F] flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C5F258] text-[20px]">folder_special</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">DigiLocker</h4>
                      <span className="text-[10px] text-[#C5F258]">Synced 2 hours ago</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={digiLockerSynced}
                    onChange={(e) => setDigiLockerSynced(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#C5F258]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Access granted for Driving Licence, Vehicle Registration Certificate, and Aadhaar offline XML package.
                </p>
              </div>

              {/* mParivahan */}
              <div className="p-4 rounded-2xl bg-[#201F1F] flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#DEB7FF] text-[20px]">directions_car</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">mParivahan (MoRTH)</h4>
                      <span className="text-[10px] text-[#DEB7FF]">DL & RC Real-Time Sync</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={mParivahanSynced}
                    onChange={(e) => setMParivahanSynced(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#C5F258]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Auto-pulls vehicle fitness, road tax validity, pollution certificates (PUC), and pending e-challans.
                </p>
              </div>

              {/* ABHA */}
              <div className="p-4 rounded-2xl bg-[#201F1F] flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#C5F258] text-[20px]">medical_services</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">ABHA (Ayushman Bharat)</h4>
                      <span className="text-[10px] text-[#C5F258]">91-8842-1092-4412</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={abhaSynced}
                    onChange={(e) => setAbhaSynced(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#C5F258]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Syncs hospital discharge summaries and digital lab reports to minimize reimbursement query cycles.
                </p>
              </div>

              {/* NICR */}
              <div className="p-4 rounded-2xl bg-[#201F1F] flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FFB691] text-[20px]">security</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">NICR Claims Registry</h4>
                      <span className="text-[10px] text-[#FFB691]">Zero-Fraud Token</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={nicrSynced}
                    onChange={(e) => setNicrSynced(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#C5F258]"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Ensures your claim submission payload matches industry standard anti-fraud and zero-rejection protocols.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): AI Copilot Controls & Privacy */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* AI Copilot Controls */}
          <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#632D93] flex items-center justify-center text-[#DEB7FF]">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI Copilot Controls</h3>
                <p className="text-[11px] text-zinc-400">Cognitive filing assistant settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div className="text-xs">
                  <span className="font-bold text-white block">Contextual Claim Memory</span>
                  <span className="text-[11px] text-zinc-400 leading-tight mt-0.5 block">
                    Retain vehicle and medical history across filings for zero-redundancy prompts.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={claimMemory}
                  onChange={(e) => setClaimMemory(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded accent-[#C5F258]"
                />
              </div>

              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div className="text-xs">
                  <span className="font-bold text-white block">Pre-Flight OCR Auto-Scan</span>
                  <span className="text-[11px] text-zinc-400 leading-tight mt-0.5 block">
                    Automatically enhance blur, detect missing seals, and cross-validate dates.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={preFlightOcr}
                  onChange={(e) => setPreFlightOcr(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded accent-[#C5F258]"
                />
              </div>

              <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div className="text-xs">
                  <span className="font-bold text-white block">Surveyor Habit Modeling</span>
                  <span className="text-[11px] text-zinc-400 leading-tight mt-0.5 block">
                    Provide proactive tips based on assigned surveyor historical inspection patterns.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={surveyorModeling}
                  onChange={(e) => setSurveyorModeling(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded accent-[#C5F258]"
                />
              </div>

              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-2">
                  Default Alert Channel
                </span>
                <div className="flex items-center gap-4 text-xs text-white">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-[#C5F258]" />
                    <span>WhatsApp Direct</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded accent-[#C5F258]" />
                    <span>SMS Urgent</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Persistent Database & Sample Data Engine */}
          <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#C5F258]/20 flex items-center justify-center text-[#C5F258]">
                  <span className="material-symbols-outlined text-[20px]">database</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Database & Sample Data Engine</h3>
                  <p className="text-[11px] text-zinc-400">Server-Side Persistent Data Store</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                Live Synced
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#201F1F] text-xs space-y-2">
              <div className="flex justify-between text-zinc-400">
                <span>Database Status</span>
                <span className="text-[#C5F258] font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-pulse"></span>
                  Connected (Active)
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Sample & Uploaded Documents</span>
                <span className="text-white font-mono font-semibold">{dbInfo?.totalDocuments || 6} files</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Claims Registered</span>
                <span className={`font-mono font-semibold ${dbInfo?.totalClaims === 0 ? 'text-[#C5F258]' : 'text-white'}`}>
                  {dbInfo?.totalClaims ?? 0} dossiers {dbInfo?.totalClaims === 0 ? '• Brand New Account' : ''}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Active Tracking Claim</span>
                <span className={`font-mono font-semibold ${dbInfo?.activeClaimId ? 'text-[#DEB7FF]' : 'text-zinc-500'}`}>
                  {dbInfo?.activeClaimId || 'None (Brand New Account)'}
                </span>
              </div>
            </div>

            {resetMessage && (
              <div className="p-2.5 rounded-xl bg-[#C5F258]/10 border border-[#C5F258]/30 text-xs text-[#C5F258] animate-fade-in flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>{resetMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={handleWipeAllClaims}
                disabled={isResettingDb}
                className="py-2.5 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                title="Deletes all claim records and resets to zero claims"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>Wipe Claims (Fresh Account)</span>
              </button>

              <button
                onClick={handleSeedSample}
                disabled={isResettingDb}
                className="py-2.5 px-3 rounded-xl bg-[#632D93]/40 hover:bg-[#632D93]/60 text-[#DEB7FF] border border-[#DEB7FF]/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                title="Seeds a test claim to verify step-by-step resolution"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                <span>Seed Test Claim (Creta)</span>
              </button>
            </div>

            <button
              onClick={handleResetDb}
              disabled={isResettingDb}
              className="py-2 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 disabled:opacity-50 text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-white/5 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">restart_alt</span>
              <span>{isResettingDb ? 'Processing...' : 'Reset Entire Database to Factory State'}</span>
            </button>
          </div>

          {/* Cryptographic Ledger & Audit */}
          <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[#C5F258]">
                <span className="material-symbols-outlined text-[20px]">fingerprint</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Ledger & Privacy</h3>
                <p className="text-[11px] text-zinc-400">Zero-Knowledge Proof & Sovereignty</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#201F1F] text-xs space-y-1.5">
              <div className="flex justify-between text-zinc-400">
                <span>Storage Region</span>
                <span className="text-white font-semibold">ap-south-1 (Mumbai, IN)</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Encryption Standard</span>
                <span className="text-white font-mono font-semibold">AES-256-GCM</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Dossier SHA-256</span>
                <span className="text-[#C5F258] font-semibold">Active & Immutable</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              All evidence packages uploaded are sealed with non-fungible cryptographic hashes compliant with IRDAI data residency mandates.
            </p>

            <button
              onClick={() => alert('Cryptographic audit trail ledger displayed in audit viewer.')}
              className="text-left text-xs font-bold text-[#C5F258] hover:underline flex items-center gap-1"
            >
              <span>View Complete Cryptographic Audit Trail</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </button>
          </div>

          {/* Emergency Nominee */}
          <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#FFB691] text-[20px]">contacts</span>
                <h3 className="text-sm font-bold text-white">Emergency Nominee</h3>
              </div>
              <button 
                onClick={() => alert('Edit Nominee info')}
                className="text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#201F1F] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="font-bold text-white">Ananya Kapoor</span>
                <span className="text-zinc-400">Spouse • 100% Share</span>
              </div>
              <div className="text-zinc-400 flex items-center gap-1 font-mono">
                <span className="material-symbols-outlined text-[14px]">call</span>
                <span>+91 98765 09876</span>
              </div>
              <span className="text-[10px] text-[#C5F258] block pt-1">
                Linked beneficiary on Health Floater & Motor Policies
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
