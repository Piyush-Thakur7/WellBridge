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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [activeTabMobile, setActiveTabMobile] = useState<"dashboard" | "history">("dashboard");

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

  // Authenticated Patient Dashboard
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* SECTION B: APP HEADER */}
      <AppHeader user={user} onSignOut={handleSignOut} />

      {/* SECTION C: MEDICAL DISCLAIMER BANNER */}
      <MedicalDisclaimerBanner />

      {/* Mobile Tab Switcher */}
      <div className="md:hidden bg-white border-b border-slate-100 px-4 py-2 flex items-center justify-around">
        <button
          onClick={() => setActiveTabMobile("dashboard")}
          className={`text-xs font-semibold py-1.5 px-4 rounded-xl transition ${
            activeTabMobile === "dashboard"
              ? "bg-teal-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          🩺 Health Dashboard
        </button>
        <button
          onClick={() => setActiveTabMobile("history")}
          className={`text-xs font-semibold py-1.5 px-4 rounded-xl transition ${
            activeTabMobile === "history"
              ? "bg-teal-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          📊 Health History
        </button>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8">
        {/* Welcome Greeting Header */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-700">
            {(() => {
              const hour = new Date().getHours();
              let timeGreeting = "Good morning";
              if (hour >= 5 && hour < 12) {
                timeGreeting = "Good morning";
              } else if (hour >= 12 && hour < 17) {
                timeGreeting = "Good afternoon";
              } else if (hour >= 17 && hour < 21) {
                timeGreeting = "Good evening";
              } else {
                timeGreeting = "Good night";
              }
              const firstName = user.displayName ? user.displayName.trim().split(" ")[0] : "";
              return firstName ? `${timeGreeting}, ${firstName} 👋` : `${timeGreeting} 👋`;
            })()}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Here's your health dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area (col-span-2 on desktop) */}
          <div className={`lg:col-span-2 flex flex-col gap-8 ${activeTabMobile === "history" ? "hidden md:flex" : "flex"}`}>
            {/* FEATURE 4: DOCTOR VISIT BRIEF GENERATOR */}
            <DoctorBriefGenerator user={user} onBriefSaved={handleTriggerRefresh} />

            {/* FEATURE A: AI HEALTH COMPANION CHAT */}
            <HealthCompanion user={user} />

            {/* FEATURE 2: MULTIMODAL LAB REPORT SCANNER */}
            <LabReportScanner user={user} onScanSaved={handleTriggerRefresh} />

            {/* FEATURE 3: DAILY SYMPTOM & WELLNESS JOURNAL */}
            <SymptomJournal user={user} onJournalSaved={handleTriggerRefresh} />
          </div>

          {/* Right Sidebar Area (col-span-1 on desktop) */}
          <aside className={`lg:col-span-1 ${activeTabMobile === "dashboard" ? "hidden md:block" : "block"}`}>
            <div className="sticky top-20">
              <HealthHistorySidebar user={user} refreshTrigger={historyRefreshKey} />
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-100 bg-white/50 print:hidden">
        WellBridge AI • Encrypted patient medical journal and AI multimodal reasoning engine
      </footer>
    </div>
  );
}
