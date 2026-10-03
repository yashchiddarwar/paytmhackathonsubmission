import React from 'react';
import { ScreenType } from '../types';

interface HeaderProps {
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenSearch: () => void;
  onToggleMobileMenu: () => void;
  activeClaim?: any;
}

export const Header: React.FC<HeaderProps> = ({
  activeScreen,
  onNavigate,
  onOpenSearch,
  onToggleMobileMenu,
  activeClaim
}) => {
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

      {/* Right: Search, Notifications & Account */}
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

        {/* Profile Pill -> My Account */}
        <button
          onClick={() => onNavigate('my-account')}
          className={`flex items-center gap-2 p-1 pr-3 rounded-full transition-all group ${
            activeScreen === 'my-account'
              ? 'ring-2 ring-[#C5F258] bg-zinc-800'
              : 'hover:bg-zinc-800/80 bg-[#1C1B1B] border border-white/[0.08]'
          }`}
          aria-label="My Account"
        >
          <div className="w-8 h-8 rounded-full bg-[#632D93] border border-[#DEB7FF]/40 flex items-center justify-center text-[#DEB7FF] text-xs font-bold group-hover:scale-105 transition-transform">
            YK
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-tight">My Account</span>
            <span className="text-[10px] text-zinc-400 leading-none">Yashar K.</span>
          </div>
        </button>
      </div>
    </header>
  );
};
