import React, { useState } from 'react';
import { ScreenType } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenType) => void;
  onSelectDocument?: (docId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectDocument
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const quickItems = [
    { title: 'FIR (First Information Report)', category: 'Document', icon: 'description', action: () => { onNavigate('document-library'); onSelectDocument?.('doc-fir'); onClose(); } },
    { title: 'Driving Licence (Both Sides)', category: 'Document', icon: 'badge', action: () => { onNavigate('document-library'); onSelectDocument?.('doc-dl'); onClose(); } },
    { title: 'Vehicle Registration Certificate (RC)', category: 'Document', icon: 'directions_car', action: () => { onNavigate('document-library'); onSelectDocument?.('doc-rc'); onClose(); } },
    { title: 'Repair Estimate & Labor Quotation', category: 'Document', icon: 'request_quote', action: () => { onNavigate('document-library'); onSelectDocument?.('doc-estimate'); onClose(); } },
    { title: 'Accident Damage — Creta SX(O) [MOT-9284-IN]', category: 'Active Claim', icon: 'car_crash', action: () => { onNavigate('my-claims'); onClose(); } },
    { title: 'AI Claim Pilot Assistant', category: 'Copilot', icon: 'auto_awesome', action: () => { onNavigate('ai-claim-pilot'); onClose(); } },
    { title: 'Diagnostic Document Scanner', category: 'Tool', icon: 'document_scanner', action: () => { onNavigate('check-document'); onClose(); } },
  ];

  const filtered = query.trim() === '' 
    ? quickItems 
    : quickItems.filter(item => item.title.toLowerCase().includes(query.toLowerCase()) || item.category.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/75 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-[#181818] border border-white/10 rounded-2xl shadow-2xl overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#131313]">
          <span className="material-symbols-outlined text-zinc-400 text-[22px]">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, claims, rules, or guides..."
            autoFocus
            className="w-full bg-transparent text-white text-base outline-none placeholder-zinc-500 font-medium"
          />
          <button 
            onClick={onClose}
            className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-white/10"
          >
            ESC
          </button>
        </div>

        <div className="p-3 max-h-96 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            {query ? 'Matching Results' : 'Suggested Fast Jumps'}
          </div>
          <div className="space-y-1 mt-1">
            {filtered.map((item, idx) => (
              <button
                key={idx}
                onClick={item.action}
                className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.06] text-left transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[#C5F258] group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white group-hover:text-[#C5F258] transition-colors">{item.title}</div>
                    <div className="text-xs text-zinc-400">{item.category}</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-zinc-500 text-[18px] group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-zinc-400 text-sm">
                No matching results found for "{query}". Try "FIR", "Motor", or "Claim Pilot".
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-[#121212] border-t border-white/[0.08] flex items-center justify-between text-[11px] text-zinc-400">
          <span>Tip: Press ⌘K anywhere to open fast navigation</span>
          <span className="flex items-center gap-1.5 text-[#C5F258]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258]"></span> IRDAI Verified Database
          </span>
        </div>
      </div>
    </div>
  );
};
