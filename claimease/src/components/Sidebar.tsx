import React from 'react';
import { ScreenType } from '../types';

interface SidebarProps {
  activeScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onNavigate,
  isOpenMobile,
  onCloseMobile
}) => {
  const navItems: { id: ScreenType; label: string; icon: string }[] = [
    { id: 'home', label: 'Home', icon: 'dashboard' },
    { id: 'explore-claims', label: 'Explore Claims', icon: 'explore' },
    { id: 'document-library', label: 'Document Library', icon: 'folder_open' },
    { id: 'check-document', label: 'Check My Document', icon: 'document_scanner' },
    { id: 'ai-claim-pilot', label: 'AI Claim Pilot', icon: 'auto_awesome' },
    { id: 'my-claims', label: 'My Claims', icon: 'work' },
  ];

  const handleNavClick = (screen: ScreenType) => {
    onNavigate(screen);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen w-64 p-6 flex flex-col justify-between shrink-0 bg-[#0E0E0E] border-r border-white/[0.08] z-50 overflow-y-auto transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#C5F258] flex items-center justify-center shadow-[0_0_24px_-4px_rgba(197,242,88,0.35)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[#151F00] font-bold text-[22px]">shield</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl text-white tracking-tight font-bold font-display">ClaimEase</span>
              <span className="text-[10px] text-zinc-400 font-mono tracking-wider">AI CLAIM PILOT</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = activeScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-[#C5F258] text-[#151F00] font-bold shadow-[0_4px_20px_-4px_rgba(197,242,88,0.3)]'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-[#151F00] font-bold' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.id === 'my-claims' && (
                    <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-[#151F00]/20 text-[#151F00]' : 'bg-[#C5F258]/20 text-[#C5F258]'
                    }`}>
                      1 Active
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Explainer Module */}
        <div className="mt-6 p-4 rounded-2xl bg-[#131313] border border-white/[0.08] relative overflow-hidden">
          <div className="flex items-center gap-1.5 mb-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C5F258]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#DEB7FF]"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF823A]"></span>
          </div>
          <p className="text-xs text-white leading-tight font-semibold mb-1">Your insurance claim, explained.</p>
          <p className="text-[11px] text-zinc-400 leading-snug">Real-time AI document diagnostics & filing guidance.</p>
        </div>
      </aside>
    </>
  );
};
