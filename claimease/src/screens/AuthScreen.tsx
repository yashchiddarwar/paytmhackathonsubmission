/**
 * AuthScreen — High-conversion Login / Register gateway with 1-Click Demo access.
 */
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { login, demoLogin, register } = useAuth();
  const [mode, setMode]         = useState<Mode>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        if (!email.trim() || !password) {
          setError('Please fill in both email and password.');
          setLoading(false);
          return;
        }
        await login(email, password);
      } else {
        if (!fullName.trim()) {
          setError('Please enter your full legal name.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters long.');
          setLoading(false);
          return;
        }
        await register(email, password, fullName);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await demoLogin();
    } catch (err: any) {
      setError(err.message || 'Demo access error. Trying standard demo credentials…');
      try {
        await login('demo@claimease.com', 'demo123');
      } catch (e: any) {
        setError('Could not connect to demo account. Please create a new account.');
      }
    } finally {
      setDemoLoading(false);
    }
  };

  const fillDemoCreds = () => {
    setEmail('demo@claimease.com');
    setPassword('demo123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background glow ambient rings */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#C5F258]/8 blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full bg-[#632D93]/15 blur-[160px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#201F1F]/40 blur-[200px]" />
      </div>

      {/* Top Header Branding */}
      <div className="relative z-10 w-full max-w-md flex items-center justify-between pt-2">
        <div className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#C5F258] flex items-center justify-center shadow-[0_0_20px_rgba(197,242,88,0.3)]">
            <span className="material-symbols-outlined text-[#0B0B0B] text-xl font-bold">
              shield_check
            </span>
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight font-display">ClaimEase</span>
            <span className="block text-[10px] text-zinc-400 font-mono leading-none">Autonomous Claim Orchestrator</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/[0.08] text-[11px] text-[#C5F258]">
          <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-pulse"></span>
          <span>IRDAI Grounded</span>
        </div>
      </div>

      {/* Primary Auth Modal / Card */}
      <div className="relative z-10 w-full max-w-md my-auto pt-6 pb-4">
        <div className="bg-[#141414]/90 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 flex flex-col gap-6">
          
          {/* Quick Demo Access Hero Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#C5F258]/15 via-[#C5F258]/5 to-transparent border border-[#C5F258]/30 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#C5F258] flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                Instant Evaluation Access
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#C5F258]/20 text-[#C5F258] text-[10px] font-mono font-bold">
                1-CLICK
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Explore the complete AI claim copilot, document vision OCR, and settlement workflows immediately with pre-configured access.
            </p>
            <button
              type="button"
              onClick={handleQuickDemo}
              disabled={demoLoading || loading}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#C5F258] hover:bg-[#b8e748] text-[#0B0B0B] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(197,242,88,0.25)] disabled:opacity-50"
            >
              {demoLoading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Logging into Demo Session…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  <span>Enter as Demo Evaluator (1-Click)</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest">or sign in below</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* Tabs: Sign In / Create Account */}
          <div className="flex rounded-xl bg-zinc-900/80 p-1 border border-white/[0.04]">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                  mode === m
                    ? 'bg-[#1F1F1F] text-white shadow-md border border-white/10'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name (Register Mode Only) */}
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-zinc-300">
                  Full Legal Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">
                    person
                  </span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Arjun Sharma"
                    autoComplete="name"
                    required={mode === 'register'}
                    className="w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#C5F258] focus:ring-1 focus:ring-[#C5F258]/30 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-zinc-300">
                  Email Address
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={fillDemoCreds}
                    className="text-[10px] text-[#C5F258] hover:underline font-mono"
                  >
                    Use demo credentials
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#C5F258] focus:ring-1 focus:ring-[#C5F258]/30 transition-all font-mono"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-zinc-300">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[18px]">
                  lock
                </span>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Min. 6 characters' : 'Enter your password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                  className="w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-[#C5F258] focus:ring-1 focus:ring-[#C5F258]/30 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {showPass ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/30 rounded-xl px-3.5 py-2.5 animate-shake">
                <span className="material-symbols-outlined text-red-400 text-[16px] shrink-0 mt-0.5">error</span>
                <p className="text-red-400 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full py-3 rounded-xl font-bold text-xs bg-white text-black hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2 shadow-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>{mode === 'login' ? 'Verifying Account…' : 'Creating Account…'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to Account' : 'Register & Start Claims'}</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/[0.04]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#C5F258]">lock</span>
              <span>256-bit AES JWT</span>
            </span>
            <span>Zero-Knowledge Vault</span>
          </div>
        </div>
      </div>

      {/* Footer Details */}
      <div className="relative z-10 text-center text-xs text-zinc-500">
        ClaimEase AI · Autonomous Motor & Health Claims Resolution Architecture
      </div>
    </div>
  );
}
