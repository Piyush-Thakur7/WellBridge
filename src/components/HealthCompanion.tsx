import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { HealthProfile } from "../types";
import { Sparkles, Send, Loader2, CheckCircle2, ShieldAlert, RotateCcw } from "lucide-react";

interface HealthCompanionProps {
  user: User;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
}

const ONBOARDING_QUESTIONS = [
  {
    key: "age_gender",
    prompt: "Hi! I'm your WellBridge health companion. To give you personalized guidance, I'd love to learn a bit about you. What is your age and gender?",
  },
  {
    key: "conditions",
    prompt: "Do you have any ongoing medical conditions? (e.g., diabetes, hypertension, thyroid, asthma — or none)",
  },
  {
    key: "medications",
    prompt: "Are you currently taking any regular medications or supplements?",
  },
  {
    key: "allergies",
    prompt: "Any known allergies (food, drug, or environmental)?",
  },
  {
    key: "lifestyle",
    prompt: "How would you describe your typical lifestyle? (active, moderate, sedentary)",
  },
];

export const HealthCompanion: React.FC<HealthCompanionProps> = ({ user }) => {
  const [profile, setProfile] = useState<HealthProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tempProfileAnswers, setTempProfileAnswers] = useState<Record<string, string>>({});

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  // Load existing profile from Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadProfile() {
      try {
        setProfileLoading(true);
        const profileRef = doc(db, "users", user.uid, "health_profile", "current");
        const snap = await getDoc(profileRef);

        if (snap.exists() && snap.data()?.isComplete) {
          const loadedData = snap.data() as HealthProfile;
          if (isMounted) {
            setProfile(loadedData);
            setMessages([
              {
                id: "welcome-ready",
                role: "ai",
                text: `Welcome back! I have your health profile active. How can I assist you with your health, medications, or lab inquiries today?`,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
        } else {
          if (isMounted) {
            setProfile(null);
            setOnboardingStep(0);
            setMessages([
              {
                id: "onboard-0",
                role: "ai",
                text: ONBOARDING_QUESTIONS[0].prompt,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]);
          }
        }
      } catch (err: any) {
        console.error("Error loading health profile:", err);
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || isSending) return;

    setErrorMsg(null);
    setInputText("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);

    // Handle Onboarding Questions flow
    if (!profile || !profile.isComplete) {
      const currentStepKey = ONBOARDING_QUESTIONS[onboardingStep]?.key;
      const updatedAnswers = { ...tempProfileAnswers, [currentStepKey]: text };
      setTempProfileAnswers(updatedAnswers);

      const nextStep = onboardingStep + 1;

      if (nextStep < ONBOARDING_QUESTIONS.length) {
        setOnboardingStep(nextStep);
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `onboard-${nextStep}`,
              role: "ai",
              text: ONBOARDING_QUESTIONS[nextStep].prompt,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }, 400);
        return;
      } else {
        // Complete Profile and save to Firestore
        setIsSending(true);
        try {
          // Parse age and gender from answer 0
          const ageGenderRaw = updatedAnswers["age_gender"] || "";
          const completedProfile: HealthProfile = {
            userId: user.uid,
            age: ageGenderRaw,
            gender: ageGenderRaw,
            conditions: updatedAnswers["conditions"] || "None",
            medications: updatedAnswers["medications"] || "None",
            allergies: updatedAnswers["allergies"] || "None",
            lifestyle: updatedAnswers["lifestyle"] || "Moderate",
            isComplete: true,
          };

          // Save sanitized profile to Firestore under /users/{userId}/health_profile/current
          const profileDocRef = doc(db, "users", user.uid, "health_profile", "current");
          await setDoc(profileDocRef, {
            ...completedProfile,
            updatedAt: serverTimestamp(),
          });

          setProfile(completedProfile);

          setMessages((prev) => [
            ...prev,
            {
              id: `onboard-complete`,
              role: "ai",
              text: `Thank you! Your health profile is now securely saved and active. You can now ask me any health questions, inquire about symptoms, medications, or ask for questions to prepare for your next checkup.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        } catch (err: any) {
          console.error("Failed to save health profile:", err);
          setErrorMsg("Could not save your profile to cloud storage. Please try again.");
        } finally {
          setIsSending(false);
        }
        return;
      }
    }

    // General Health Q&A Mode
    setIsSending(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/health-companion-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.map(m => ({ role: m.role, text: m.text })),
          healthProfile: profile,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch response from health companion.");
      }

      const data = await res.json();
      const aiReply = data.reply || "I am here to help. Could you provide a bit more detail?";

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "ai",
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error("Chat error:", err);
      setErrorMsg(err.message || "Something went wrong while generating health response.");
    } finally {
      setIsSending(false);
    }
  };

  const handleResetProfile = async () => {
    if (!window.confirm("Would you like to reset your health profile and redo the setup questions?")) return;
    setProfile(null);
    setOnboardingStep(0);
    setTempProfileAnswers({});
    setMessages([
      {
        id: "onboard-reset",
        role: "ai",
        text: ONBOARDING_QUESTIONS[0].prompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div id="ai-health-companion-card" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Your Health Companion
            </h2>
            <p className="text-xs text-slate-500">
              Interactive personalized AI assistant tailored to your wellness profile
            </p>
          </div>
        </div>

        {/* Profile Status Badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {profileLoading ? (
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking profile...
            </span>
          ) : profile?.isComplete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Health Profile: Complete ✅
              </span>
              <button
                onClick={handleResetProfile}
                title="Update or reset health profile"
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-md transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              Health Profile: Setting up... ({onboardingStep + 1}/{ONBOARDING_QUESTIONS.length})
            </span>
          )}
        </div>
      </div>

      {/* Profile quick summary pill (if complete) */}
      {profile?.isComplete && (
        <div className="mb-3 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span><strong className="text-slate-700">Demographics:</strong> {profile.age || "N/A"}</span>
          <span><strong className="text-slate-700">Conditions:</strong> {profile.conditions || "None"}</span>
          <span><strong className="text-slate-700">Meds:</strong> {profile.medications || "None"}</span>
          <span><strong className="text-slate-700">Allergies:</strong> {profile.allergies || "None"}</span>
          <span><strong className="text-slate-700">Lifestyle:</strong> {profile.lifestyle || "Moderate"}</span>
        </div>
      )}

      {/* Chat messages viewport */}
      <div
        ref={chatContainerRef}
        className="flex flex-col gap-3.5 flex-grow min-h-[300px] max-h-[460px] overflow-y-auto pr-1 p-1"
      >
        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-slate-100 rounded-2xl rounded-br-none p-3 text-sm text-slate-700 max-w-[85%] shadow-2xs">
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-[10px] text-slate-400 block text-right mt-1 font-medium">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            );
          }

          // AI message
          return (
            <div key={msg.id} className="flex justify-start">
              <div className="bg-white border-l-4 border-teal-500 rounded-2xl rounded-bl-none p-3.5 text-sm text-slate-700 max-w-[90%] shadow-xs border border-slate-100">
                <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-bold text-teal-700">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>WellBridge Companion</span>
                </div>

                <div className="leading-relaxed whitespace-pre-wrap text-slate-700 text-sm space-y-2">
                  {msg.text}
                </div>

                {/* Mandatory Medical Disclaimer at end of every response */}
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <p className="text-[10px] text-slate-400 italic">
                    ℹ️ This is general wellness information, not medical advice.
                  </p>
                </div>

                <span className="text-[10px] text-slate-400 block text-right mt-1 font-medium">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-white border-l-4 border-teal-500 rounded-2xl rounded-bl-none p-3 text-sm text-slate-600 shadow-xs border border-slate-100 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span className="text-xs">WellBridge Companion is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="my-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="underline font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="mt-3 relative flex items-center gap-2">
        <input
          id="health-companion-input"
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isSending || profileLoading}
          placeholder={
            !profile || !profile.isComplete
              ? "Type your answer (e.g. 45, female / No conditions)..."
              : "Ask anything (e.g. What does high cholesterol mean? Is 130/85 BP normal?)..."
          }
          className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <button
          id="health-companion-send-btn"
          type="submit"
          disabled={isSending || !inputText.trim() || profileLoading}
          className="bg-teal-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-xs hover:bg-teal-700 transition flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer shrink-0"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
