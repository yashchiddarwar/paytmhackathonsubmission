import React, { useState } from 'react';
import { ScreenType, ClaimDocument } from '../types';
import { MOCK_DOCUMENTS } from '../data/mockData';

interface DocumentLibraryScreenProps {
  onNavigate: (screen: ScreenType) => void;
  onSelectDocument: (doc: ClaimDocument) => void;
  onCheckDocument: (doc: ClaimDocument) => void;
}

export const DocumentLibraryScreen: React.FC<DocumentLibraryScreenProps> = ({
  onNavigate,
  onSelectDocument,
  onCheckDocument
}) => {
  const [activeLob, setActiveLob] = useState<'All' | 'Motor' | 'Health' | 'Travel' | 'Life' | 'Personal Accident'>('Motor');
  const [activeStatus, setActiveStatus] = useState<string>('All documents');
  const [searchFilter, setSearchFilter] = useState('');

  const lobs = ['All', 'Motor', 'Health', 'Travel', 'Life', 'Personal Accident'] as const;
  const statuses = ['All documents', 'Required (4)', 'Recommended (2)', 'Uploaded', 'Needs attention'];

  const filteredDocs = MOCK_DOCUMENTS.filter(doc => {
    if (activeLob !== 'All' && doc.category !== activeLob) return false;
    if (activeStatus === 'Required (4)' && !doc.required) return false;
    if (activeStatus === 'Recommended (2)' && doc.required) return false;
    if (activeStatus === 'Uploaded' && doc.status !== 'verified') return false;
    if (activeStatus === 'Needs attention' && doc.status === 'verified') return false;
    if (searchFilter.trim() !== '') {
      const q = searchFilter.toLowerCase();
      return doc.name.toLowerCase().includes(q) || doc.description.toLowerCase().includes(q) || doc.code.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto gap-8 pb-12 animate-fade-in">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#C5F258] animate-pulse"></span>
              <span className="text-xs uppercase tracking-wider font-bold text-[#C5F258]">
                Verification Atlas
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-400">v2.4 Live Policy Engine</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight font-display">
              Document Library
            </h1>
            <p className="text-zinc-400 text-sm md:text-base mt-2 max-w-3xl leading-relaxed">
              Understand what each document is, why insurers mandate it, and what constitutes a valid, rejection-proof submission.
            </p>
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search documents, IDs, forms..."
              className="w-full bg-[#181818] border border-white/[0.08] focus:border-[#C5F258] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Policy Context Strip */}
        <div className="p-3.5 rounded-xl bg-[#1C1B1B] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-300">
              <span className="material-symbols-outlined text-[#C5F258] text-[18px]">verified_user</span>
              <span>Viewing documents for:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-[#C5F258] font-bold">
                MOTOR INSURANCE — ACCIDENT DAMAGE
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold text-zinc-400">
            <span className="flex items-center gap-1.5 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5F258]"></span> 4 Mandatory
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFB691]"></span> 2 Recommended
            </span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col gap-3">
          {/* LOB Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">LOB:</span>
            {lobs.map((lob) => (
              <button
                key={lob}
                onClick={() => setActiveLob(lob)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                  activeLob === lob
                    ? 'bg-[#C5F258] text-[#151F00] font-bold shadow-sm'
                    : 'bg-[#1C1B1B] text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {lob === 'Motor' ? '🚗 Motor' : lob}
              </button>
            ))}
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mr-1">STATUS:</span>
            {statuses.map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  activeStatus === status
                    ? 'bg-zinc-700 text-white'
                    : 'bg-[#181818] text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Document Cards */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white font-display">
              Motor Insurance — Accident Damage
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Documents commonly required by insurers for collision, third-party, and own-damage claims.
            </p>
          </div>
          <span className="text-xs text-zinc-400 bg-zinc-900 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px]">folder</span>
            <span>{filteredDocs.length} documents available</span>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl bg-[#1C1B1B] border border-white/[0.08] hover:border-white/20 transition-all flex flex-col justify-between group shadow-lg"
            >
              <div>
                {/* Card Top: Icon & Required Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-200 group-hover:text-[#C5F258] transition-colors">
                    <span className="material-symbols-outlined text-[20px]">
                      {doc.id === 'doc-fir' ? 'shield' : 
                       doc.id === 'doc-dl' ? 'badge' : 
                       doc.id === 'doc-rc' ? 'assignment' : 
                       doc.id === 'doc-policy' ? 'policy' : 
                       doc.id === 'doc-estimate' ? 'receipt_long' : 'photo_camera'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    doc.required 
                      ? 'bg-[#C5F258] text-[#151F00]' 
                      : 'bg-[#FFB691]/20 text-[#FFB691]'
                  }`}>
                    {doc.required ? 'Required' : 'Recommended'}
                  </span>
                </div>

                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block mb-1">
                  {doc.id === 'doc-fir' ? 'POLICE DOCUMENTATION' :
                   doc.id === 'doc-dl' ? 'DRIVER IDENTIFICATION' :
                   doc.id === 'doc-rc' ? 'ASSET OWNERSHIP' :
                   doc.id === 'doc-policy' ? 'COVERAGE SCHEDULE' :
                   doc.id === 'doc-estimate' ? 'WORKSHOP BILL' : 'VISUAL EVIDENCE'}
                </span>

                <h3 className="text-base font-bold text-white mb-2 leading-tight group-hover:text-[#C5F258] transition-colors">
                  {doc.name}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 mb-4">
                  {doc.description}
                </p>

                {/* Micro tags */}
                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400 pb-2">
                  {doc.id === 'doc-fir' && (
                    <>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">schedule</span> 24h filing norm
                      </span>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">verified</span> Certified copy
                      </span>
                    </>
                  )}
                  {doc.id === 'doc-dl' && (
                    <>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">calendar_today</span> Active validity
                      </span>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">badge</span> Class match
                      </span>
                    </>
                  )}
                  {doc.id === 'doc-rc' && (
                    <>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">tag</span> VIN match
                      </span>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">check</span> Both sides
                      </span>
                    </>
                  )}
                  {doc.id === 'doc-estimate' && (
                    <>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">store</span> Authorized shop
                      </span>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">list_alt</span> Itemized
                      </span>
                    </>
                  )}
                  {doc.id === 'doc-photos' && (
                    <>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">crop_free</span> 4 angles min
                      </span>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">location_on</span> Geotagged
                      </span>
                    </>
                  )}
                  {doc.id === 'doc-policy' && (
                    <>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">security</span> Comprehensive
                      </span>
                      <span className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-white/5">
                        <span className="material-symbols-outlined text-[13px] text-[#C5F258]">check_circle</span> Term active
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectDocument(doc)}
                  className="px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>View details</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
                <button
                  onClick={() => onCheckDocument(doc)}
                  className="px-3.5 py-1.5 rounded-full bg-[#632D93]/40 hover:bg-[#632D93] text-[#DEB7FF] text-xs font-bold border border-[#DEB7FF]/30 flex items-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">document_scanner</span>
                  <span>Check</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guidance Banner: Not sure which document you need? */}
      <div className="p-6 rounded-3xl bg-[#1C1B1B] border border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#632D93] flex items-center justify-center text-[#DEB7FF] shrink-0">
            <span className="material-symbols-outlined text-[24px]">psychology</span>
          </div>
          <div>
            <span className="text-[11px] text-[#DEB7FF] font-bold uppercase tracking-wider block">
              AI Claim Pilot Guidance •
            </span>
            <h3 className="text-lg font-bold text-white font-display mt-0.5">
              Not sure which document you need?
            </h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl">
              Describe what occurred in natural words. Our reasoning engine matches local motor claims jurisprudence and generates your customized document checklist.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('ai-claim-pilot')}
          className="px-6 py-3 rounded-full bg-[#DEB7FF] hover:bg-[#d09fff] text-[#2D0050] font-bold text-sm shadow-[0_4px_20px_-2px_rgba(222,183,255,0.4)] transition-all flex items-center gap-2 shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">chat_spark</span>
          <span>Ask AI Claim Pilot</span>
        </button>
      </div>

      {/* Need Help With A Document Knowledge Base Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">Need help with a document?</span>
          <span className="text-xs text-zinc-400">Instant Knowledge Base</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div 
            onClick={() => onSelectDocument(MOCK_DOCUMENTS[0])}
            className="p-4 rounded-xl bg-[#181818] hover:bg-zinc-800 border border-white/[0.08] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#C5F258] text-[20px]">menu_book</span>
              <div>
                <span className="text-xs font-bold text-white block">What is this document?</span>
                <span className="text-[11px] text-zinc-400">Glossary, acceptable equivalents</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-zinc-400 text-[18px]">chevron_right</span>
          </div>

          <div 
            onClick={() => onNavigate('ai-claim-pilot')}
            className="p-4 rounded-xl bg-[#181818] hover:bg-zinc-800 border border-white/[0.08] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#DEB7FF] text-[20px]">near_me</span>
              <div>
                <span className="text-xs font-bold text-white block">How do I get it?</span>
                <span className="text-[11px] text-zinc-400">Online RTO portals, police kiosks</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-zinc-400 text-[18px]">chevron_right</span>
          </div>

          <div 
            onClick={() => onNavigate('check-document')}
            className="p-4 rounded-xl bg-[#181818] hover:bg-zinc-800 border border-white/[0.08] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#FF823A] text-[20px]">fact_check</span>
              <div>
                <span className="text-xs font-bold text-white block">Check my document</span>
                <span className="text-[11px] text-zinc-400">Pre-flight automated scans</span>
              </div>
            </div>
            <span className="material-symbols-outlined text-zinc-400 text-[18px]">chevron_right</span>
          </div>
        </div>
      </div>
    </div>
  );
};
