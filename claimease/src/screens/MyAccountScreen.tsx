import React, { useState, useEffect } from 'react';
import { ScreenType, Policy } from '../types';
import { resetDatabase, fetchDbStatus, clearAllClaims, seedSampleClaim, fetchPolicies, createPolicy, deletePolicy } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  const { user, updateProfile, logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'policies' | 'vaults' | 'copilot' | 'security' | 'billing'>('profile');

  // Real Dynamic Policies from Database
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // Profile Edit Modal State
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCkyc, setEditCkyc] = useState('');
  const [editAadhaar, setEditAadhaar] = useState('');
  const [editPan, setEditPan] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Nominee Edit Modal State
  const [isEditNomineeOpen, setIsEditNomineeOpen] = useState(false);
  const [editNomineeName, setEditNomineeName] = useState('');
  const [editNomineeRelation, setEditNomineeRelation] = useState('Spouse');
  const [editNomineePhone, setEditNomineePhone] = useState('');

  // Add Policy Modal State
  const [isAddPolicyOpen, setIsAddPolicyOpen] = useState(false);
  const [newPolicyCarrier, setNewPolicyCarrier] = useState('HDFC ERGO General Insurance');
  const [newPolicyNumber, setNewPolicyNumber] = useState('');
  const [newPolicyType, setNewPolicyType] = useState('Comprehensive Private Car Package');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleReg, setNewVehicleReg] = useState('');
  const [newSumInsured, setNewSumInsured] = useState('');
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);

  // Interactive Vault Toggles (Synced with DB)
  const [digiLockerSynced, setDigiLockerSynced] = useState(user?.digilockerSynced ?? false);
  const [mParivahanSynced, setMParivahanSynced] = useState(user?.mparivahanSynced ?? false);
  const [abhaSynced, setAbhaSynced] = useState(user?.abhaSynced ?? false);
  const [nicrSynced, setNicrSynced] = useState(user?.nicrSynced ?? false);

  // Copilot Controls
  const [claimMemory, setClaimMemory] = useState(true);
  const [preFlightOcr, setPreFlightOcr] = useState(true);
  const [surveyorModeling, setSurveyorModeling] = useState(true);

  // Database State
  const [dbInfo, setDbInfo] = useState<any>(null);
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const loadPolicies = async () => {
    setLoadingPolicies(true);
    try {
      const pols = await fetchPolicies();
      setPolicies(pols);
    } catch (e) {
      console.warn('Error loading policies:', e);
    } finally {
      setLoadingPolicies(false);
    }
  };

  const refreshStatus = async () => {
    const info = await fetchDbStatus();
    setDbInfo(info);
  };

  useEffect(() => {
    refreshStatus();
    loadPolicies();
  }, []);

  useEffect(() => {
    if (user) {
      setEditFullName(user.fullName || '');
      setEditPhone(user.phone || '');
      setEditCkyc(user.ckyc || '');
      setEditAadhaar(user.aadhaarLast4 || '');
      setEditPan(user.pan || '');
      setEditNomineeName(user.nomineeName || '');
      setEditNomineeRelation(user.nomineeRelation || 'Spouse');
      setEditNomineePhone(user.nomineePhone || '');
      setDigiLockerSynced(!!user.digilockerSynced);
      setMParivahanSynced(!!user.mparivahanSynced);
      setAbhaSynced(!!user.abhaSynced);
      setNicrSynced(!!user.nicrSynced);
    }
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        fullName: editFullName.trim(),
        phone: editPhone.trim() || undefined,
        ckyc: editCkyc.trim() || undefined,
        aadhaarLast4: editAadhaar.trim() || undefined,
        pan: editPan.trim().toUpperCase() || undefined,
      });
      setIsEditProfileOpen(false);
      setResetMessage('✓ Profile information updated.');
      setTimeout(() => setResetMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSaveNominee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await updateProfile({
        nomineeName: editNomineeName.trim(),
        nomineeRelation: editNomineeRelation,
        nomineePhone: editNomineePhone.trim(),
      });
      setIsEditNomineeOpen(false);
      setResetMessage('✓ Emergency nominee updated.');
      setTimeout(() => setResetMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update nominee');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleVaultToggle = async (vault: 'digi' | 'pari' | 'abha' | 'nicr', newVal: boolean) => {
    if (vault === 'digi') {
      setDigiLockerSynced(newVal);
      await updateProfile({ digilockerSynced: newVal });
    } else if (vault === 'pari') {
      setMParivahanSynced(newVal);
      await updateProfile({ mparivahanSynced: newVal });
    } else if (vault === 'abha') {
      setAbhaSynced(newVal);
      await updateProfile({ abhaSynced: newVal });
    } else if (vault === 'nicr') {
      setNicrSynced(newVal);
      await updateProfile({ nicrSynced: newVal });
    }
  };

  const handleAddPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingPolicy(true);
    try {
      const pNumber = newPolicyNumber.trim() || `POL-${Math.floor(1000 + Math.random() * 9000)}-IN`;
      await createPolicy({
        policyNumber: pNumber,
        carrier: newPolicyCarrier,
        productName: newPolicyType,
        coverageTier: 'Comprehensive Zero-Dep Shield',
        deductible: '₹1,000 Standard Compulsory',
        hasZeroDep: true,
        vehicle: newVehicleModel ? {
          makeModel: newVehicleModel,
          registration: newVehicleReg || 'N/A',
          chassis: `CHAS${Math.floor(100000 + Math.random() * 900000)}B`
        } : undefined,
        sumInsured: newSumInsured || undefined,
        status: 'active'
      });
      await loadPolicies();
      setIsAddPolicyOpen(false);
      setNewPolicyNumber('');
      setNewVehicleModel('');
      setNewVehicleReg('');
      setNewSumInsured('');
      setResetMessage(`✓ Policy ${pNumber} linked to your account.`);
      setTimeout(() => setResetMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to add policy');
    } finally {
      setIsAddingPolicy(false);
    }
  };

  const handleDeletePolicy = async (pId: string, pNum: string) => {
    if (!confirm(`Are you sure you want to unlink policy ${pNum}?`)) return;
    try {
      await deletePolicy(pId);
      await loadPolicies();
      setResetMessage(`Policy ${pNum} unlinked.`);
      setTimeout(() => setResetMessage(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete policy');
    }
  };

  const handleResetDb = async () => {
    setIsResettingDb(true);
    try {
      await resetDatabase();
      await refreshStatus();
      await loadPolicies();
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
      await loadPolicies();
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
      await loadPolicies();
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
    { id: 'policies', label: `Linked Policies (${policies.length})` },
    { id: 'vaults', label: 'Government ID Vault' },
    { id: 'copilot', label: 'AI Copilot Preferences' },
    { id: 'security', label: 'Security & Audit Logs' },
    { id: 'billing', label: 'Database & System' },
  ] as const;

  // Derive display initials
  const initials = user
    ? (user.fullName || user.email)
        .split(/\s+/)
        .map(w => w[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : 'U';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'Recently Joined';

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto gap-8 pb-12 animate-fade-in font-sans">
      {/* Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">Home</button>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-zinc-300">My Account</span>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-white font-semibold">{tabs.find(t => t.id === activeTab)?.label}</span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1B1B] border border-white/[0.08]">
          <span className="w-2 h-2 rounded-full bg-[#C5F258] shadow-[0_0_8px_#c5f258]"></span>
          <span className="text-xs font-semibold text-white">
            {user?.ckyc ? 'IRDAI CKYC Verified • Level 1 High Trust' : 'JWT Authenticated Session'}
          </span>
        </div>
      </div>

      {/* Page Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-display">
              My Profile & Vault
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#632D93]/60 text-[#DEB7FF] border border-[#DEB7FF]/30 text-xs font-bold font-mono">
              USER ID: {user?.id ? user.id.slice(0, 8) : 'ACTIVE'}
            </span>
          </div>
          <p className="text-zinc-400 text-sm md:text-base mt-2 max-w-3xl leading-relaxed">
            Manage your verified digital identity, linked insurance contracts from SQLite, statutory KYC documents, and government vault sync bridges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1C1B1B] hover:bg-zinc-800 text-white border border-white/10 text-xs font-semibold transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            <span>Edit Profile</span>
          </button>
          <button
            onClick={() => setIsAddPolicyOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] text-xs font-bold transition-all shadow-[0_4px_20px_-4px_rgba(197,242,88,0.35)]"
          >
            <span className="material-symbols-outlined text-[16px]">add_moderator</span>
            <span>Link New Policy</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {resetMessage && (
        <div className="p-3.5 rounded-2xl bg-[#C5F258]/10 border border-[#C5F258]/30 text-xs text-[#C5F258] animate-fade-in flex items-center justify-between gap-2 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span className="font-semibold">{resetMessage}</span>
          </div>
          <button onClick={() => setResetMessage('')} className="text-zinc-400 hover:text-white">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

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

      {/* TAB 1: OVERVIEW & PROFILE */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): User Profile & Statutory Info */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* User Profile Card */}
            <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] flex flex-col gap-6 relative overflow-hidden shadow-xl">
              <div className="absolute -right-16 -top-16 w-56 h-56 bg-[#C5F258]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-[#632D93] border border-[#DEB7FF]/40 flex items-center justify-center text-[#DEB7FF] text-xl font-bold shadow-lg">
                      {initials}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#131313] flex items-center justify-center">
                      <span className="w-3.5 h-3.5 rounded-full bg-[#C5F258] flex items-center justify-center text-[#151F00] text-[10px] font-bold">
                        ✓
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-white font-display">
                        {user?.fullName || 'ClaimEase Member'}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                        {user?.memberTier || 'Standard Member'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5 font-mono">{user?.email || 'user@example.com'}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-300">
                      <span className="font-mono text-zinc-400">
                        {user?.phone ? user.phone : (
                          <button onClick={() => setIsEditProfileOpen(true)} className="text-[#C5F258] hover:underline">
                            + Add Phone Number
                          </button>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C5F258]/10 text-[#C5F258] text-[10px]">
                        <span className="material-symbols-outlined text-[12px]">verified</span> JWT Authenticated
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-xs text-zinc-300">
                    <span className="material-symbols-outlined text-[15px] text-[#C5F258]">verified_user</span>
                    <span>Member since {memberSince}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditProfileOpen(true)}
                      className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>Edit Profile</span>
                    </button>
                    <button 
                      onClick={() => logout()}
                      className="px-3.5 py-1.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold border border-red-500/30 transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">logout</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Statutory Identity Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04] flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">IRDAI Central KYC</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      {user?.ckyc ? `#${user.ckyc}` : 'Not Linked'}
                    </span>
                    {user?.ckyc ? (
                      <span className="material-symbols-outlined text-[14px] text-[#C5F258]">verified</span>
                    ) : (
                      <button onClick={() => setIsEditProfileOpen(true)} className="text-[10px] text-[#C5F258] hover:underline font-semibold">
                        + Add CKYC
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {user?.ckyc ? 'IRDAI Registry Verified' : 'Click to add your 14-digit CKYC'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04] flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Aadhaar e-KYC</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      {user?.aadhaarLast4 ? `•••• ${user.aadhaarLast4}` : 'Not Linked'}
                    </span>
                    {user?.aadhaarLast4 ? (
                      <span className="material-symbols-outlined text-[14px] text-[#C5F258]">verified_user</span>
                    ) : (
                      <button onClick={() => setIsEditProfileOpen(true)} className="text-[10px] text-[#C5F258] hover:underline font-semibold">
                        + Link Aadhaar
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {user?.aadhaarLast4 ? 'Offline XML e-KYC Sealed' : 'Required for cashless approvals'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.04] flex flex-col gap-1">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">PAN Verification</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono">
                      {user?.pan ? user.pan : 'Not Linked'}
                    </span>
                    {user?.pan ? (
                      <span className="material-symbols-outlined text-[14px] text-[#C5F258]">check_circle</span>
                    ) : (
                      <button onClick={() => setIsEditProfileOpen(true)} className="text-[10px] text-[#C5F258] hover:underline font-semibold">
                        + Add PAN
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    {user?.pan ? 'NSDL Tax Records Matched' : 'Required for claims above ₹50,000'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Policies Snapshot */}
            <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C5F258]/15 flex items-center justify-center text-[#C5F258]">
                    <span className="material-symbols-outlined text-[20px]">policy</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-display">Linked Insurance Contracts</h3>
                    <p className="text-xs text-zinc-400">{policies.length} Active policies under continuous monitoring</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('policies')}
                  className="text-xs font-bold text-[#C5F258] hover:underline flex items-center gap-1"
                >
                  <span>Manage All Policies</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {policies.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#201F1F] text-center text-xs text-zinc-400">
                  No policies linked yet.
                  <button onClick={() => setIsAddPolicyOpen(true)} className="text-[#C5F258] ml-1 font-semibold hover:underline">
                    Link your first policy now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {policies.slice(0, 2).map(p => (
                    <div key={p.id} className="p-4 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col justify-between gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{p.carrier}</span>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                          {p.policyNumber}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1">{p.productName}</p>
                      {p.vehicle && (
                        <span className="text-[10px] text-[#C5F258] font-mono">
                          {p.vehicle.makeModel} • {p.vehicle.registration}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Nominee & Quick Vault Snapshot */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Emergency Nominee */}
            <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#FFB691] text-[20px]">contacts</span>
                  <h3 className="text-sm font-bold text-white">Emergency Nominee</h3>
                </div>
                <button 
                  onClick={() => setIsEditNomineeOpen(true)}
                  className="text-zinc-400 hover:text-white p-1"
                  title="Edit Nominee"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                </button>
              </div>

              {user?.nomineeName ? (
                <div className="p-3.5 rounded-xl bg-[#201F1F] text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-white">{user.nomineeName}</span>
                    <span className="text-zinc-400">{user.nomineeRelation || 'Beneficiary'} • 100% Share</span>
                  </div>
                  <div className="text-zinc-400 flex items-center gap-1 font-mono">
                    <span className="material-symbols-outlined text-[14px]">call</span>
                    <span>{user.nomineePhone || 'No phone set'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#201F1F] text-xs text-center space-y-2">
                  <p className="text-zinc-400">No emergency nominee registered yet.</p>
                  <button
                    onClick={() => setIsEditNomineeOpen(true)}
                    className="px-3 py-1 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[11px] font-bold hover:bg-[#C5F258]/25"
                  >
                    + Add Nominee
                  </button>
                </div>
              )}
            </div>

            {/* Quick Government Vaults Bridge */}
            <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#DEB7FF] text-[20px]">account_balance</span>
                  <h3 className="text-sm font-bold text-white">Government ID Bridges</h3>
                </div>
                <button onClick={() => setActiveTab('vaults')} className="text-xs text-[#C5F258] hover:underline">
                  Configure
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#201F1F] flex items-center justify-between">
                  <span>DigiLocker</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${digiLockerSynced ? 'bg-[#C5F258]/20 text-[#C5F258]' : 'bg-zinc-800 text-zinc-500'}`}>
                    {digiLockerSynced ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#201F1F] flex items-center justify-between">
                  <span>mParivahan (RC & DL)</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mParivahanSynced ? 'bg-[#C5F258]/20 text-[#C5F258]' : 'bg-zinc-800 text-zinc-500'}`}>
                    {mParivahanSynced ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LINKED POLICIES */}
      {activeTab === 'policies' && (
        <div className="flex flex-col gap-6">
          <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white font-display">Insurance Contracts Management</h2>
                <p className="text-xs text-zinc-400 mt-1">
                  All active policies stored in SQLite database. AI automatically maps uploaded claims to matching policy contracts.
                </p>
              </div>
              <button
                onClick={() => setIsAddPolicyOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#C5F258] hover:bg-[#b8e748] text-[#151F00] text-xs font-bold transition-all shadow-md self-start"
              >
                <span className="material-symbols-outlined text-[16px]">add_moderator</span>
                <span>Link Another Policy</span>
              </button>
            </div>

            {loadingPolicies ? (
              <div className="py-12 flex flex-col items-center gap-2 text-zinc-400 text-xs">
                <span className="material-symbols-outlined animate-spin text-2xl text-[#C5F258]">sync</span>
                <span>Fetching policy records from database…</span>
              </div>
            ) : policies.length === 0 ? (
              <div className="p-12 rounded-2xl bg-[#201F1F] text-center flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-zinc-500">policy</span>
                <p className="text-sm font-semibold text-white">No policies found in your vault</p>
                <p className="text-xs text-zinc-400 max-w-md">
                  Link your Motor, Health, or Travel insurance policy to enable automatic cashless coverage and AI discrepancy verification.
                </p>
                <button
                  onClick={() => setIsAddPolicyOpen(true)}
                  className="mt-2 px-5 py-2 rounded-full bg-[#C5F258] text-[#151F00] text-xs font-bold"
                >
                  Link Policy Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policies.map((p) => {
                  const hasActiveClaim = p.activeClaimId || p.status === 'in-progress';
                  return (
                    <div 
                      key={p.id} 
                      className={`p-5 rounded-2xl bg-[#201F1F] border transition-all flex flex-col justify-between gap-4 ${
                        hasActiveClaim ? 'border-[#C5F258]/40 shadow-[0_0_20px_rgba(197,242,88,0.06)]' : 'border-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${hasActiveClaim ? 'bg-[#FF823A] animate-pulse' : 'bg-[#C5F258]'}`}></span>
                            <span className="text-sm font-bold text-white">{p.carrier}</span>
                          </div>
                          <p className="text-xs text-zinc-300 font-medium mt-1">{p.productName}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px]">
                            {p.policyNumber}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDeletePolicy(p.id, p.policyNumber)}
                          className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                          title="Unlink Policy"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>

                      {p.vehicle && (
                        <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Insured Vehicle:</span>
                            <span className="text-white font-semibold">{p.vehicle.makeModel}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-400">Registration Number:</span>
                            <span className="text-white font-mono font-semibold">{p.vehicle.registration}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-white/[0.04]">
                        <span className="text-zinc-400">
                          {p.sumInsured ? `Sum Insured: ${p.sumInsured}` : 'Zero-Dep Coverage'}
                        </span>
                        {hasActiveClaim ? (
                          <button
                            onClick={onResumeClaim}
                            className="px-3 py-1 rounded-full bg-[#FF823A]/20 text-[#FF823A] text-xs font-bold hover:bg-[#FF823A]/30 transition-colors"
                          >
                            Track Claim →
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/15 text-[#C5F258] text-[10px] font-bold">
                            Active & Ready
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GOVERNMENT ID VAULT */}
      {activeTab === 'vaults' && (
        <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-white font-display">Government & Statutory Identity Vaults</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Direct API integrations with national data repositories. Toggle synchronization to auto-pull evidence during claim submission.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* DigiLocker */}
            <div className="p-5 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C5F258]/15 flex items-center justify-center text-[#C5F258]">
                    <span className="material-symbols-outlined text-[24px]">folder_special</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">DigiLocker</h4>
                    <span className="text-[11px] text-[#C5F258]">{digiLockerSynced ? 'Sync Active • Verified' : 'Disconnected'}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={digiLockerSynced}
                  onChange={(e) => handleVaultToggle('digi', e.target.checked)}
                  className="w-5 h-5 rounded accent-[#C5F258] cursor-pointer"
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Fetches Driving Licence, Vehicle Registration Certificate, and Aadhaar offline XML package to confirm insurable interest.
              </p>
            </div>

            {/* mParivahan */}
            <div className="p-5 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#DEB7FF]/15 flex items-center justify-center text-[#DEB7FF]">
                    <span className="material-symbols-outlined text-[24px]">directions_car</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">mParivahan (MoRTH)</h4>
                    <span className="text-[11px] text-[#DEB7FF]">{mParivahanSynced ? 'Vahan & Sarathi Connected' : 'Disconnected'}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={mParivahanSynced}
                  onChange={(e) => handleVaultToggle('pari', e.target.checked)}
                  className="w-5 h-5 rounded accent-[#C5F258] cursor-pointer"
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Auto-pulls vehicle fitness, road tax validity, pollution certificates (PUC), and pending e-challans to ensure claim validity.
              </p>
            </div>

            {/* ABHA */}
            <div className="p-5 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#C5F258]/15 flex items-center justify-center text-[#C5F258]">
                    <span className="material-symbols-outlined text-[24px]">medical_services</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">ABHA (Ayushman Bharat)</h4>
                    <span className="text-[11px] text-[#C5F258]">{abhaSynced ? 'ABHA Health Bridge Online' : 'Disconnected'}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={abhaSynced}
                  onChange={(e) => handleVaultToggle('abha', e.target.checked)}
                  className="w-5 h-5 rounded accent-[#C5F258] cursor-pointer"
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Syncs hospital discharge summaries and digital lab reports to minimize reimbursement query cycles for health insurance.
              </p>
            </div>

            {/* NICR */}
            <div className="p-5 rounded-2xl bg-[#201F1F] border border-white/[0.06] flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFB691]/15 flex items-center justify-center text-[#FFB691]">
                    <span className="material-symbols-outlined text-[24px]">security</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">NICR Claims Registry</h4>
                    <span className="text-[11px] text-[#FFB691]">{nicrSynced ? 'Zero-Fraud Token Active' : 'Disconnected'}</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={nicrSynced}
                  onChange={(e) => handleVaultToggle('nicr', e.target.checked)}
                  className="w-5 h-5 rounded accent-[#C5F258] cursor-pointer"
                />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ensures your claim submission payload matches industry standard anti-fraud and zero-rejection protocols.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COPILOT PREFERENCES */}
      {activeTab === 'copilot' && (
        <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-white font-display">AI Claim Pilot Preferences</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Configure autonomous cognitive reasoning, document verification thresholds, and surveyor inspection assistance.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#201F1F] flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-white block">Contextual Claim Memory</span>
                <span className="text-xs text-zinc-400 leading-relaxed mt-1 block">
                  Retain vehicle details, damage patterns, and historical evidence across filings for seamless one-shot answers.
                </span>
              </div>
              <input
                type="checkbox"
                checked={claimMemory}
                onChange={(e) => setClaimMemory(e.target.checked)}
                className="w-5 h-5 rounded accent-[#C5F258] cursor-pointer mt-1"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#201F1F] flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-white block">Pre-Flight OCR Auto-Scan</span>
                <span className="text-xs text-zinc-400 leading-relaxed mt-1 block">
                  Automatically run vision OCR on uploaded documents to detect cropped stamps, blurriness, or date mismatches.
                </span>
              </div>
              <input
                type="checkbox"
                checked={preFlightOcr}
                onChange={(e) => setPreFlightOcr(e.target.checked)}
                className="w-5 h-5 rounded accent-[#C5F258] cursor-pointer mt-1"
              />
            </div>

            <div className="p-4 rounded-2xl bg-[#201F1F] flex items-start justify-between gap-4">
              <div>
                <span className="text-sm font-bold text-white block">Surveyor Inspection Guidance</span>
                <span className="text-xs text-zinc-400 leading-relaxed mt-1 block">
                  Provide proactive advice during physical or video surveyor visits based on IRDAI settlement norms.
                </span>
              </div>
              <input
                type="checkbox"
                checked={surveyorModeling}
                onChange={(e) => setSurveyorModeling(e.target.checked)}
                className="w-5 h-5 rounded accent-[#C5F258] cursor-pointer mt-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY & AUDIT */}
      {activeTab === 'security' && (
        <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-white font-display">Security, Privacy & Session Tokens</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Your session is protected with cryptographically signed JSON Web Tokens (JWT) using HMAC-SHA256.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#201F1F] text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-zinc-400">Authenticated User ID:</span>
              <span className="text-white font-mono">{user?.id || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Email Address:</span>
              <span className="text-white font-mono">{user?.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">JWT Token Status:</span>
              <span className="text-[#C5F258] font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-pulse"></span>
                Active (Valid for 7 Days)
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-zinc-400 block">Raw JWT Bearer Token (Stateless)</span>
            <div className="p-3.5 rounded-xl bg-black border border-white/10 font-mono text-[11px] text-zinc-400 break-all select-all">
              {token || localStorage.getItem('claimease_token') || 'Token active in local storage'}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => logout()}
              className="px-5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Terminate Active Session (Sign Out)</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 6: DATABASE & SYSTEM DIAGNOSTICS */}
      {activeTab === 'billing' && (
        <div className="p-6 md:p-8 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] shadow-xl flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-white font-display">Database & Diagnostics Engine</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Local persistent SQLite database and vector knowledge store state.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#201F1F] text-xs space-y-2.5">
            <div className="flex justify-between text-zinc-400">
              <span>Database Engine:</span>
              <span className="text-white font-semibold">SQLite Embedded + ChromaDB Vector Store</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Total Policies Registered:</span>
              <span className="text-white font-mono font-semibold">{policies.length} records</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Claims in Database:</span>
              <span className="text-white font-mono font-semibold">{dbInfo?.totalClaims ?? 0} claims</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Active Tracking Dossier:</span>
              <span className={`font-mono font-semibold ${dbInfo?.activeClaimId ? 'text-[#DEB7FF]' : 'text-zinc-500'}`}>
                {dbInfo?.activeClaimId || 'None (Clean Account)'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleWipeAllClaims}
              disabled={isResettingDb}
              className="py-3 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              <span>Wipe All Claims (Start Fresh)</span>
            </button>

            <button
              onClick={handleSeedSample}
              disabled={isResettingDb}
              className="py-3 px-4 rounded-xl bg-[#632D93]/40 hover:bg-[#632D93]/60 text-[#DEB7FF] border border-[#DEB7FF]/30 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span>Seed Sample Claim (Creta)</span>
            </button>
          </div>

          <button
            onClick={handleResetDb}
            disabled={isResettingDb}
            className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset Database to Canonical Initial State</span>
          </button>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C5F258]/20 flex items-center justify-center text-[#C5F258]">
                  <span className="material-symbols-outlined text-[18px]">badge</span>
                </div>
                <h3 className="text-base font-bold text-white">Edit Profile & Statutory KYC</h3>
              </div>
              <button onClick={() => setIsEditProfileOpen(false)} className="text-zinc-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. Arjun Sharma"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +91 98450 12894"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">CKYC Number (14 Digits)</label>
                  <input
                    type="text"
                    value={editCkyc}
                    onChange={(e) => setEditCkyc(e.target.value)}
                    placeholder="e.g. 8920194819"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Aadhaar (Last 4 Digits)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={editAadhaar}
                    onChange={(e) => setEditAadhaar(e.target.value)}
                    placeholder="e.g. 9214"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">PAN Card Number</label>
                <input
                  type="text"
                  maxLength={10}
                  value={editPan}
                  onChange={(e) => setEditPan(e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-[#C5F258] text-[#0B0B0B] font-bold hover:bg-[#b8e748] disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Nominee Modal */}
      {isEditNomineeOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl flex flex-col gap-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFB691]/20 flex items-center justify-center text-[#FFB691]">
                  <span className="material-symbols-outlined text-[18px]">family_restroom</span>
                </div>
                <h3 className="text-base font-bold text-white">Edit Emergency Nominee</h3>
              </div>
              <button onClick={() => setIsEditNomineeOpen(false)} className="text-zinc-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNominee} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Nominee Full Name</label>
                <input
                  type="text"
                  value={editNomineeName}
                  onChange={(e) => setEditNomineeName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Relationship</label>
                <select
                  value={editNomineeRelation}
                  onChange={(e) => setEditNomineeRelation(e.target.value)}
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Nominee Phone Number</label>
                <input
                  type="text"
                  value={editNomineePhone}
                  onChange={(e) => setEditNomineePhone(e.target.value)}
                  placeholder="e.g. +91 98765 09876"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsEditNomineeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-[#C5F258] text-[#0B0B0B] font-bold hover:bg-[#b8e748] disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving…' : 'Save Nominee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Policy Modal */}
      {isAddPolicyOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl flex flex-col gap-5 animate-scale-up">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C5F258]/20 flex items-center justify-center text-[#C5F258]">
                  <span className="material-symbols-outlined text-[18px]">add_moderator</span>
                </div>
                <h3 className="text-base font-bold text-white">Link New Insurance Policy</h3>
              </div>
              <button onClick={() => setIsAddPolicyOpen(false)} className="text-zinc-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAddPolicy} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Insurer / Carrier</label>
                  <input
                    type="text"
                    value={newPolicyCarrier}
                    onChange={(e) => setNewPolicyCarrier(e.target.value)}
                    placeholder="e.g. ICICI Lombard"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={newPolicyNumber}
                    onChange={(e) => setNewPolicyNumber(e.target.value)}
                    placeholder="e.g. MOT-5521-IN"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Product / Plan Name</label>
                <input
                  type="text"
                  value={newPolicyType}
                  onChange={(e) => setNewPolicyType(e.target.value)}
                  placeholder="e.g. Comprehensive Motor Insurance"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Vehicle Model (Optional)</label>
                  <input
                    type="text"
                    value={newVehicleModel}
                    onChange={(e) => setNewVehicleModel(e.target.value)}
                    placeholder="e.g. Honda City ZX"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Registration No. (Optional)</label>
                  <input
                    type="text"
                    value={newVehicleReg}
                    onChange={(e) => setNewVehicleReg(e.target.value.toUpperCase())}
                    placeholder="e.g. KA-01-AB-1234"
                    className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Sum Insured / IDV (Optional)</label>
                <input
                  type="text"
                  value={newSumInsured}
                  onChange={(e) => setNewSumInsured(e.target.value)}
                  placeholder="e.g. ₹8,50,000"
                  className="w-full bg-[#1C1C1C] border border-white/10 rounded-xl px-3.5 py-2.5 text-white focus:border-[#C5F258] focus:outline-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddPolicyOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 font-semibold hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingPolicy}
                  className="px-5 py-2 rounded-xl bg-[#C5F258] text-[#0B0B0B] font-bold hover:bg-[#b8e748] disabled:opacity-50"
                >
                  {isAddingPolicy ? 'Linking Policy…' : 'Link Policy to Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
