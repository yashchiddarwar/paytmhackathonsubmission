import React, { useState, useRef, useEffect } from 'react';
import { ScreenType } from '../types';
import { AuthUser, useAuth } from '../context/AuthContext';

interface HeaderProps {
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
  activeClaim?: any;
  user?: AuthUser | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  onNavigate,
  onOpenSearch,
  onToggleMobileMenu,
  activeClaim,
  user,
}) => {
  const { logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Generate initials from name/email
  const initials = user
    ? (user.fullName || user.email)
        .split(/\s+/)
        .map(w => w[0]?.toUpperCase())
        .slice(0, 2)
        .join('')
    : 'U';

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'User';

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-[#131313]/90 backdrop-blur-xl border-b border-white/[0.08] z-40 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Left: Mobile hamburger & Context Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden w-9 h-9 rounded-full bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 hover:text-white"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1B1B] border border-white/[0.08]">
          <span className={`w-2 h-2 rounded-full ${activeClaim ? 'bg-[#C5F258] animate-pulse' : 'bg-zinc-500'}`}></span>
          <span className="text-xs text-zinc-300 font-medium">
            {activeClaim ? 'Active Claim' : 'Clean Account'}
          </span>
          {activeClaim && (
            <span className="hidden sm:inline text-zinc-500 font-mono text-[11px]">• {activeClaim.claimNumber}</span>
          )}
        </div>
      </div>

      {/* Right: Search & User */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSearch}
          aria-label="Search"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1C1B1B] border border-white/[0.08] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
          <span className="hidden md:inline text-xs text-zinc-400">Search docs & claims</span>
          <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] bg-zinc-800 rounded text-zinc-400 border border-white/10 font-mono">⌘K</kbd>
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(p => !p)}
            className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-all group ${
              showUserMenu || activeScreen === 'my-account'
                ? 'ring-2 ring-[#C5F258] bg-zinc-800'
                : 'hover:bg-zinc-800/80 bg-[#1C1B1B] border border-white/[0.08]'
            }`}
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-[#632D93] border border-[#DEB7FF]/40 flex items-center justify-center text-[#DEB7FF] text-xs font-bold group-hover:scale-105 transition-transform">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-white leading-tight">{displayName}</span>
              <span className="text-[10px] text-zinc-400 leading-none">{user?.email || 'user@example.com'}</span>
            </div>
            <span className="material-symbols-outlined text-zinc-400 text-[16px] hidden sm:inline">
              {showUserMenu ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#1C1C1C] border border-[#2A2A2A] shadow-2xl overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#2A2A2A]">
                <p className="text-xs font-semibold text-[#E5E2E1] truncate">{displayName}</p>
                <p className="text-[10px] text-[#666] truncate mt-0.5">{user?.email}</p>
              </div>

              {/* Menu items */}
              <button
                onClick={() => { onNavigate('my-account'); setShowUserMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[18px] text-zinc-400">manage_accounts</span>
                My Account
              </button>

              <button
                onClick={() => { onNavigate('my-claims'); setShowUserMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[18px] text-zinc-400">folder_open</span>
                My Claims
              </button>

              <div className="border-t border-[#2A2A2A] mt-1">
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
