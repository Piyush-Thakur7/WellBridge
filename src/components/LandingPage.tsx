import React, { useState } from "react";
import { WellBridgeLogo } from "./WellBridgeLogo";
import {
  FileText,
  Activity,
  CalendarCheck,
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  BrainCircuit,
  MessageSquare,
  FileCheck,
  Menu,
  X,
} from "lucide-react";

interface LandingPageProps {
  onSignIn: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isLoading, error }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const faqs = [
    {
      q: "How does WellBridge AI analyze medical lab tests?",
      a: "WellBridge uses multimodal AI vision with an automated fallback ladder to read diagnostic blood panels, metabolic tests, and urinalysis reports. It translates numeric ranges and medical jargon into plain-language status cards (Normal, Monitor, Alert).",
    },
    {
      q: "Is my personal health data kept private and secure?",
      a: "Yes. All health logs, lab results, and symptom reflections are stored in an isolated, encrypted per-user Firestore database with strict Zero-Trust security rules. Only your authenticated Google account can read or modify your records.",
    },
    {
      q: "Can I bring these reports to my real doctor or physician?",
      a: "Absolutely. WellBridge AI includes a 30-Day Doctor Visit Clinical Brief generator with a one-click print function, designed specifically to highlight chief symptoms, medication side effects, and discussion questions for your physician.",
    },
    {
      q: "What is the AI Health Companion?",
      a: "The Health Companion is an interactive conversational assistant that builds a baseline health profile (conditions, medications, allergies, lifestyle) and provides empathetic, contextual answers to your everyday health questions.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-teal-100 selection:text-teal-900">
      {/* 1. FIXED TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Brand Logo & Name */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="w-10 h-10 flex items-center justify-center bg-teal-50 rounded-xl border border-teal-100 shadow-xs">
              <WellBridgeLogo size={28} className="w-7 h-7" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                WellBridge AI
              </span>
              <span className="text-[10px] text-teal-700 font-semibold tracking-wider uppercase">
                Patient Intelligence
              </span>
            </div>
          </div>

          {/* Right: Desktop Navigation Links + CTA */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => scrollToSection("features")}
              className="text-xs font-semibold text-slate-600 hover:text-teal-700 transition cursor-pointer"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="text-xs font-semibold text-slate-600 hover:text-teal-700 transition cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("trust")}
              className="text-xs font-semibold text-slate-600 hover:text-teal-700 transition cursor-pointer"
            >
              Trust & Security
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="text-xs font-semibold text-slate-600 hover:text-teal-700 transition cursor-pointer"
            >
              FAQ
            </button>

            <button
              id="nav-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={onSignIn}
              disabled={isLoading}
              className="bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs"
            >
              Sign In
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-2.5 shadow-md">
            <button
              onClick={() => scrollToSection("features")}
              className="block w-full text-left py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("how-it-works")}
              className="block w-full text-left py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection("trust")}
              className="block w-full text-left py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700"
            >
              Trust & Security
            </button>
            <button
              onClick={() => scrollToSection("faq")}
              className="block w-full text-left py-1.5 text-xs font-semibold text-slate-700 hover:text-teal-700"
            >
              FAQ
            </button>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative overflow-hidden py-16 sm:py-24 bg-gradient-to-b from-teal-50/40 via-white to-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Empowering Patients with Multimodal AI & Clinical Clarity</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
            Bridging Confusing Medical Reports to Everyday Health Decisions
          </h1>

          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload complex blood panels, track daily symptoms with empathetic AI reflections, consult your personal health companion, and generate printable physician briefs for your next appointment.
          </p>

          {/* Error Banner */}
          {error && (
            <div className="mt-6 max-w-md mx-auto p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl text-center shadow-xs">
              {error}
            </div>
          )}

          {/* Primary Action Button */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              id="hero-signin-btn"
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-teal-600 hover:bg-teal-700 text-white px-7 py-3.5 rounded-xl text-sm sm:text-base font-bold shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {/* Google G Logo */}
              <svg className="w-4 h-4 bg-white p-0.5 rounded-full" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{isLoading ? "Signing in..." : "Continue with Google"}</span>
            </button>

            <button
              onClick={() => scrollToSection("features")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition cursor-pointer shadow-xs"
            >
              Explore Capabilities
            </button>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 font-normal">
            No subscription required • Encrypted per-user Firestore cloud storage
          </p>
        </div>
      </section>

      {/* 3. CORE FEATURES SECTION */}
      <section id="features" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full inline-block mb-2">
              Comprehensive Health Intelligence
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Everything You Need to Understand & Advocate for Your Health
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Feature 1 */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-xs transition-all flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-800 mb-3.5">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">
                Multimodal Lab Scan
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed flex-grow">
                Drag-and-drop blood test images or PDFs. Get plain-language summaries with color-coded biomarker status cards (Normal, Monitor, Alert).
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-xs transition-all flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-800 mb-3.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">
                AI Health Companion
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed flex-grow">
                Interactive conversational assistant that learns your conditions, medications, and lifestyle to deliver personalized wellness answers.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-xs transition-all flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-800 mb-3.5">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">
                Daily Symptom Journal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed flex-grow">
                Log daily energy, pain levels, and medication effects. Receive empathetic AI reflections and automatic tag extraction.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-xs transition-all flex flex-col">
              <div className="w-10 h-10 rounded-xl bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-800 mb-3.5">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1.5">
                Doctor Visit Briefs
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed flex-grow">
                Synthesize 30-day health logs into a clean, 1-page printable clinical brief structured with chief symptoms and recommended doctor questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full inline-block mb-2">
              Simple 3-Step Flow
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              How WellBridge AI Operates
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center mb-3">
                1
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1.5">
                Upload or Converse
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Scan your medical lab sheet, share your daily wellness log, or ask the health companion about confusing medical terms.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center mb-3">
                2
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1.5">
                Multimodal AI Reasoning
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Our secure server routes requests through Gemini models with an automated fallback ladder to deliver clinical clarity and reassuring guidance.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs relative">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center mb-3">
                3
              </div>
              <h3 className="font-bold text-slate-800 text-sm mb-1.5">
                Take Control of Visits
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Print concise physician briefs, review chronological health history, and enter clinic consultations with tailored questions ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST & SECURITY */}
      <section id="trust" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full inline-block mb-2">
              Privacy First Architecture
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Your Health Data Stays Completely Private
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-start">
              <ShieldCheck className="w-6 h-6 text-teal-600 mb-2.5" />
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Zero-Trust Rules
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Owner-bound Firestore path security restricts read and write operations strictly to authenticated user identity UIDs.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-start">
              <Lock className="w-6 h-6 text-teal-600 mb-2.5" />
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Server-Side Key Isolation
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Gemini API credentials are protected server-side with no exposed keys or secrets in client browser bundles.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-start">
              <FileCheck className="w-6 h-6 text-teal-600 mb-2.5" />
              <h3 className="font-bold text-slate-900 text-sm mb-1">
                Transparent Disclaimers
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Prominent medical disclaimers support healthy doctor-patient collaboration without replacing professional diagnostic judgment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ SECTION */}
      <section id="faq" className="py-16 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full inline-block mb-2">
              Got Questions?
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-4 text-left font-semibold text-slate-800 text-xs sm:text-sm flex items-center justify-between gap-4 cursor-pointer hover:text-teal-700 transition"
                  >
                    <span>{faq.q}</span>
                    <span className="text-teal-600 text-base font-bold shrink-0">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 7. BOTTOM CTA SECTION */}
      <section className="py-16 bg-gradient-to-r from-teal-700 to-teal-900 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Take Control of Your Health Journey?
          </h2>
          <p className="mt-3 text-teal-100 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
            Join thousands of patients bridging the gap between clinical reports and daily wellness choices.
          </p>

          <div className="mt-7 flex justify-center">
            <button
              onClick={onSignIn}
              disabled={isLoading}
              className="bg-white text-teal-800 hover:bg-teal-50 px-7 py-3.5 rounded-xl text-sm font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Get Started with Google</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="py-8 bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <WellBridgeLogo size={20} className="w-5 h-5 opacity-90" />
            <span className="font-semibold text-slate-300">WellBridge AI</span>
            <span>• Encrypted patient medical journal and AI multimodal reasoning engine</span>
          </div>

          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} WellBridge AI. Not a replacement for emergency or primary medical care.
          </p>
        </div>
      </footer>
    </div>
  );
};
