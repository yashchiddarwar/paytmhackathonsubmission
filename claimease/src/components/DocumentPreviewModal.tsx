import React from 'react';
import { ClaimDocument } from '../types';

interface DocumentPreviewModalProps {
  document: ClaimDocument | null;
  onClose: () => void;
  onCheckWithDiagnostic?: (doc: ClaimDocument) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  onClose,
  onCheckWithDiagnostic
}) => {
  if (!document) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl bg-[#141414] border border-white/[0.12] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.08] flex items-start justify-between bg-[#191919]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C5F258]/15 border border-[#C5F258]/30 flex items-center justify-center text-[#C5F258]">
              <span className="material-symbols-outlined text-[22px]">description</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white font-display">{document.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  document.required ? 'bg-[#FF823A]/15 text-[#FF823A] border border-[#FF823A]/30' : 'bg-zinc-800 text-zinc-300'
                }`}>
                  {document.required ? 'Required Prerequisite' : 'Recommended'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Code: {document.code} • Category: {document.category}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content body with split preview */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Left: Specimen image / preview */}
          <div className="md:col-span-5 flex flex-col gap-3">
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black relative group aspect-[3/4] flex items-center justify-center">
              {document.specimenImageUrl ? (
                <img 
                  src={document.specimenImageUrl} 
                  alt={document.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="text-center p-6 text-zinc-400">
                  <span className="material-symbols-outlined text-4xl mb-2 text-zinc-400">image_not_supported</span>
                  <p className="text-xs">No preview available</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-zinc-300">
                <span className="font-mono text-[11px] bg-black/60 backdrop-blur px-2 py-0.5 rounded">High-DPI Specimen</span>
                <span className="text-[#C5F258] font-bold">100% Valid</span>
              </div>
            </div>

            {document.fileName && (
              <div className="p-3 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="material-symbols-outlined text-[#C5F258] text-[18px]">verified</span>
                  <span className="text-zinc-300 truncate font-mono">{document.fileName}</span>
                </div>
                <span className="text-zinc-400 shrink-0">{document.fileSize}</span>
              </div>
            )}
          </div>

          {/* Right: Explanations, Statutory Mandate & Pre-requisites */}
          <div className="md:col-span-7 flex flex-col gap-5 justify-between">
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  What is this document?
                </span>
                <p className="text-sm text-zinc-200 leading-relaxed bg-[#1A1A1A] p-3.5 rounded-xl border border-white/[0.06]">
                  {document.description}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Why Insurers Mandate It (Statutory Rule)
                </span>
                <div className="p-3.5 rounded-xl bg-[#201F1F] border border-white/[0.08] flex items-start gap-3">
                  <span className="material-symbols-outlined text-[#DEB7FF] text-[20px] shrink-0 mt-0.5">policy</span>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {document.mandateReason}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06]">
                  <span className="text-[11px] text-zinc-400 block mb-0.5">Format Accepted</span>
                  <span className="text-xs font-semibold text-white">PDF, High-Res JPG, Color PNG</span>
                </div>
                <div className="p-3 rounded-xl bg-[#181818] border border-white/[0.06]">
                  <span className="text-[11px] text-zinc-400 block mb-0.5">Minimum DPI</span>
                  <span className="text-xs font-semibold text-[#C5F258]">300 DPI (No Blur)</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/[0.08]">
              {onCheckWithDiagnostic && (
                <button
                  onClick={() => {
                    onCheckWithDiagnostic(document);
                    onClose();
                  }}
                  className="w-full sm:flex-1 py-3 px-4 rounded-full bg-[#C5F258] hover:bg-[#b5e248] text-[#151F00] font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">document_scanner</span>
                  <span>Check In Diagnostic Scanner</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
