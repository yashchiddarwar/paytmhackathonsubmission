/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ScreenType, ClaimDocument, ClaimJourneyStep } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { ClaimHelperChatbot } from './components/ClaimHelperChatbot';

import { HomeScreen } from './screens/HomeScreen';
import { ExploreClaimsScreen } from './screens/ExploreClaimsScreen';
import { DocumentLibraryScreen } from './screens/DocumentLibraryScreen';
import { CheckDocumentScreen } from './screens/CheckDocumentScreen';
import { AiClaimPilotScreen } from './screens/AiClaimPilotScreen';
import { ClaimJourneyScreen } from './screens/ClaimJourneyScreen';
import { MyAccountScreen } from './screens/MyAccountScreen';
import { MOCK_DOCUMENTS } from './data/mockData';
import { fetchActiveClaim, fetchDocuments } from './services/api';
import { DBClaim } from '../server/db';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenType>('home');
  const [claimStep, setClaimStep] = useState<ClaimJourneyStep>(2); // Default to Step 2 Verification
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<ClaimDocument | null>(null);
  const [selectedDocForCheck, setSelectedDocForCheck] = useState<ClaimDocument | null>(null);

  // Live Database Synced State
  const [activeClaim, setActiveClaim] = useState<DBClaim | null>(null);
  const [dbDocuments, setDbDocuments] = useState<ClaimDocument[]>(MOCK_DOCUMENTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch initial active claim and documents from persistent DB
  const loadDatabaseData = async () => {
    try {
      const claim = await fetchActiveClaim();
      if (claim) {
        setActiveClaim(claim);
        if (claim.currentStep) {
          setClaimStep(claim.currentStep);
        }
      } else {
        setActiveClaim(null);
        setClaimStep(1);
      }
      const docs = await fetchDocuments();
      if (docs && docs.length > 0) {
        setDbDocuments(docs);
      }
    } catch (err) {
      console.warn('Failed to load DB data, using local state:', err);
    }
  };

  useEffect(() => {
    loadDatabaseData();
  }, []);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNavigate = (screen: ScreenType) => {
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResumeClaim = () => {
    setActiveScreen('my-claims');
    setClaimStep(activeClaim?.currentStep || 2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartClaimJourney = () => {
    setActiveScreen('my-claims');
    setClaimStep(1); // Step 1 (Documents)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCheckDocument = (doc: ClaimDocument) => {
    setSelectedDocForCheck(doc);
    setActiveScreen('check-document');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDocumentAttached = async (doc: any, updatedClaim?: DBClaim | null) => {
    if (updatedClaim) {
      setActiveClaim(updatedClaim);
      if (updatedClaim.currentStep) setClaimStep(updatedClaim.currentStep);
    } else {
      await loadDatabaseData();
    }
    setToastMessage(`✓ ${doc?.name || 'Document'} verified by AI & attached to dossier!`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleClaimCreated = (newClaim: DBClaim) => {
    setActiveClaim(newClaim);
    setClaimStep(newClaim.currentStep || 1);
    setToastMessage(`✨ AI Claim Created: ${newClaim.claimNumber} (${newClaim.vehicle})`);
    setTimeout(() => setToastMessage(null), 5000);
    setActiveScreen('my-claims');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateClaimState = (updated: DBClaim) => {
    setActiveClaim(updated);
    if (updated.currentStep) {
      setClaimStep(updated.currentStep);
    }
  };

  return (
    <div className="bg-[#0B0B0B] text-[#E5E2E1] min-h-screen flex flex-col font-sans selection:bg-[#C5F258] selection:text-[#151F00]">
      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#1C1B1B] border border-[#C5F258] text-[#C5F258] font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Persistent Left Sidebar */}
      <Sidebar
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        activeClaim={activeClaim}
      />

      {/* Main App Container */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          activeScreen={activeScreen}
          onNavigate={handleNavigate}
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          activeClaim={activeClaim}
        />

        {/* Primary Viewport Canvas */}
        <main className="relative pt-20 px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full max-w-[1600px] mx-auto">
          {activeScreen === 'home' && (
            <HomeScreen
              onNavigate={handleNavigate}
              onResumeClaim={handleResumeClaim}
              onSelectCategory={() => handleNavigate('explore-claims')}
              activeClaim={activeClaim}
            />
          )}

          {activeScreen === 'explore-claims' && (
            <ExploreClaimsScreen
              onNavigate={handleNavigate}
              onSelectDocument={(doc) => setPreviewDocument(doc)}
              onStartClaimJourney={handleStartClaimJourney}
            />
          )}

          {activeScreen === 'document-library' && (
            <DocumentLibraryScreen
              onNavigate={handleNavigate}
              onSelectDocument={(doc) => setPreviewDocument(doc)}
              onCheckDocument={handleCheckDocument}
            />
          )}

          {activeScreen === 'check-document' && (
            <CheckDocumentScreen
              onNavigate={handleNavigate}
              selectedDocForCheck={selectedDocForCheck}
              onViewSample={(doc) => setPreviewDocument(doc)}
              onDocumentAttached={handleDocumentAttached}
            />
          )}

          {activeScreen === 'ai-claim-pilot' && (
            <AiClaimPilotScreen
              onNavigate={handleNavigate}
              onSelectDocument={(doc) => setPreviewDocument(doc)}
              onResumeClaim={handleResumeClaim}
              onClaimCreated={handleClaimCreated}
              activeClaim={activeClaim}
            />
          )}

          {activeScreen === 'my-claims' && (
            <ClaimJourneyScreen
              onNavigate={handleNavigate}
              onSelectDocument={(doc) => setPreviewDocument(doc)}
              onCheckDocument={handleCheckDocument}
              initialStep={claimStep}
              activeClaim={activeClaim}
              onUpdateClaim={handleUpdateClaimState}
              onOpenAiHelper={() => {}}
            />
          )}

          {activeScreen === 'my-account' && (
            <MyAccountScreen
              onNavigate={handleNavigate}
              onResumeClaim={handleResumeClaim}
              onDbReset={loadDatabaseData}
            />
          )}
        </main>
      </div>

      {/* Global Context-Aware Claim Helper Chatbot (Dockable & Floating) */}
      <ClaimHelperChatbot
        activeScreen={activeScreen}
        currentStep={claimStep}
        activeClaim={activeClaim}
        onNavigate={handleNavigate}
        onClaimCreated={handleClaimCreated}
      />

      {/* Global Quick Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleNavigate}
        onSelectDocument={(docId) => {
          const doc = dbDocuments.find(d => d.id === docId) || MOCK_DOCUMENTS.find(d => d.id === docId);
          if (doc) setPreviewDocument(doc);
        }}
      />

      {/* Document Detail & Specimen Preview Modal */}
      <DocumentPreviewModal
        document={previewDocument}
        onClose={() => setPreviewDocument(null)}
        onCheckWithDiagnostic={(doc) => handleCheckDocument(doc)}
      />
    </div>
  );
}
