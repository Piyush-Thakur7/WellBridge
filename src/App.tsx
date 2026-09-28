import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { auth, googleProvider, signInWithPopup, signOut, onAuthStateChanged } from "./lib/firebase";
import { AppHeader } from "./components/AppHeader";
import { MedicalDisclaimerBanner } from "./components/MedicalDisclaimerBanner";
import { LandingPage } from "./components/LandingPage";
import { LabReportScanner } from "./components/LabReportScanner";
import { SymptomJournal } from "./components/SymptomJournal";
import { DoctorBriefGenerator } from "./components/DoctorBriefGenerator";
import { HealthCompanion } from "./components/HealthCompanion";
import { HealthHistorySidebar } from "./components/HealthHistorySidebar";
import { Activity, MessageSquareHeart, FileText, ClipboardList, History } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'companion' | 'scanner' | 'journal' | 'brief' | 'history'>('companion');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Sign in failed:", err);
      setAuthError("Sign-in failed. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const handleTriggerRefresh = () => {
    setHistoryRefreshKey((prev) => prev + 1);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Connecting to WellBridge AI...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated: Show Landing Page
  if (!user) {
    return <LandingPage onSignIn={handleSignIn} isLoading={authLoading} error={authError} />;
  }

  const tabs = [
    { id: 'companion', label: 'AI Companion', icon: MessageSquareHeart, badge: 'Live' },
    { id: 'scanner', label: 'Lab Scanner', icon: FileText, badge: 'Vision OCR' },
    { id: 'journal', label: 'Daily Journal', icon: Activity, badge: null },
    { id: 'brief', label: 'Doctor Brief', icon: ClipboardList, badge: '1-Click' },
    { id: 'history', label: 'Health History', icon: History, badge: null },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-50 flex flex-col font-sans text-slate-800 selection:bg-teal-100 selection:text-teal-900">
      {/* Sticky App Header (Pinned at top on mobile & desktop) */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs no-print">
        <AppHeader user={user} onSignOut={handleSignOut} />
      </div>

      {/* Medical Disclaimer Banner */}
      <div className="no-print">
        <MedicalDisclaimerBanner />
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* Welcome Greeting Banner */}
        <div className="no-print bg-white p-4 sm:p-6 rounded-2xl border border-teal-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900">
                {(() => {
                  const hour = new Date().getHours();
                  let timeGreeting = "Good morning";
                  if (hour >= 12 && hour < 17) timeGreeting = "Good afternoon";
                  else if (hour >= 17 && hour < 21) timeGreeting = "Good evening";
                  else if (hour >= 21 || hour < 5) timeGreeting = "Good night";
                  const firstName = user.displayName ? user.displayName.trim().split(" ")[0] : "Patient";
                  return `${timeGreeting}, ${firstName} 👋`;
                })()}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select a clinical module below to consult your AI companion, analyze blood reports, or generate physician briefs.
            </p>
          </div>
        </div>

        {/* Segmented Navigation Tab Bar */}
        <div className="no-print flex items-center justify-center">
          <div className="inline-flex p-1.5 bg-slate-200/80 backdrop-blur-md rounded-2xl border border-slate-300/70 shadow-inner max-w-full overflow-x-auto scrollbar-none gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-teal-700 shadow-sm font-bold scale-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-600' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase hidden md:inline-block ${
                      isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-300/80 text-slate-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeTab === 'companion' && <HealthCompanion user={user} />}
            {activeTab === 'scanner' && <LabReportScanner user={user} onScanSaved={handleTriggerRefresh} />}
            {activeTab === 'journal' && <SymptomJournal user={user} onJournalSaved={handleTriggerRefresh} />}
            {activeTab === 'brief' && <DoctorBriefGenerator user={user} onBriefSaved={handleTriggerRefresh} />}
            {activeTab === 'history' && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
                <HealthHistorySidebar user={user} refreshTrigger={historyRefreshKey} />
              </div>
            )}
          </div>

          {/* Persistent Sidebar on Desktop for Companion, Scanner, Journal, Brief views */}
          {activeTab !== 'history' && (
            <aside className="hidden lg:block lg:col-span-1">
              <div className="sticky top-6">
                <HealthHistorySidebar user={user} refreshTrigger={historyRefreshKey} />
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="no-print py-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white/50">
        WellBridge AI • Encrypted patient medical journal and AI multimodal reasoning engine
      </footer>
    </div>
  );
}
