import React, { useState, useEffect, useRef } from "react";
import { User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { HealthProfile } from "../types";
import { Sparkles, Send, Loader2, CheckCircle2, ShieldAlert, RotateCcw, Edit3, X, Check } from "lucide-react";

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

  // Edit Profile Modal State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editAge, setEditAge] = useState("");
  const [editConditions, setEditConditions] = useState("");
  const [editMeds, setEditMeds] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editLifestyle, setEditLifestyle] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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

  const handleOpenEdit = () => {
    setEditAge(profile?.age || "");
    setEditConditions(profile?.conditions || "");
    setEditMeds(profile?.medications || "");
    setEditAllergies(profile?.allergies || "");
    setEditLifestyle(profile?.lifestyle || "Moderate");
    setIsEditingProfile(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSavingEdit(true);
    try {
      const updatedProfile: HealthProfile = {
        ...profile,
        age: editAge.trim() || profile.age,
        conditions: editConditions.trim() || "None",
        medications: editMeds.trim() || "None",
        allergies: editAllergies.trim() || "None",
        lifestyle: editLifestyle.trim() || "Moderate",
      };

      const profileDocRef = doc(db, "users", user.uid, "health_profile", "current");
      await setDoc(profileDocRef, {
        ...updatedProfile,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setProfile(updatedProfile);
      setIsEditingProfile(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `profile-updated-${Date.now()}`,
          role: "ai",
          text: `✅ I've updated your health profile! Your active conditions are now: "${updatedProfile.conditions}" and medications: "${updatedProfile.medications}". How can I help you today?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      console.error("Failed to update health profile:", err);
      setErrorMsg("Failed to save updated profile changes. Please try again.");
    } finally {
      setIsSavingEdit(false);
    }
  };

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
    <div id="ai-health-companion-card" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
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
                title="Restart onboarding setup"
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

      {/* Profile quick summary pill with Edit Button (if complete) */}
      {profile?.isComplete && (
        <div className="mb-3 px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span><strong className="text-slate-700">Demographics:</strong> {profile.age || "N/A"}</span>
            <span><strong className="text-slate-700">Conditions:</strong> {profile.conditions || "None"}</span>
            <span><strong className="text-slate-700">Meds:</strong> {profile.medications || "None"}</span>
            <span><strong className="text-slate-700">Allergies:</strong> {profile.allergies || "None"}</span>
            <span><strong className="text-slate-700">Lifestyle:</strong> {profile.lifestyle || "Moderate"}</span>
          </div>
          <button
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 transition cursor-pointer shrink-0"
          >
            <Edit3 className="w-3 h-3 text-teal-600" />
            <span>Edit Profile</span>
          </button>
        </div>
      )}

      {/* EDIT PROFILE MODAL */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">✏️</span>
                <h3 className="text-base font-bold text-slate-800">Update Health Profile</h3>
              </div>
              <button
                onClick={() => setIsEditingProfile(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Age & Gender</label>
                <input
                  type="text"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. 20, Female"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Medical Conditions <span className="text-slate-400 font-normal">(Remove cured diseases or update)</span>
                </label>
                <input
                  type="text"
                  value={editConditions}
                  onChange={(e) => setEditConditions(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. None, Asthma, Hypertension"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Current Medications & Supplements
                </label>
                <input
                  type="text"
                  value={editMeds}
                  onChange={(e) => setEditMeds(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. Vitamin D, Metformin 500mg"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Known Allergies</label>
                <input
                  type="text"
                  value={editAllergies}
                  onChange={(e) => setEditAllergies(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  placeholder="e.g. Penicillin, Peanuts, None"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Lifestyle Activity Level</label>
                <select
                  value={editLifestyle}
                  onChange={(e) => setEditLifestyle(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                >
                  <option value="Active">Active (Exercise 4+ days/week)</option>
                  <option value="Moderate">Moderate (Light activity/walking)</option>
                  <option value="Sedentary">Sedentary (Desk job / minimal movement)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
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
            <div className="bg-teal-50/70 border border-teal-100 rounded-2xl p-3 flex items-center gap-2 text-xs text-teal-800">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
              <span>WellBridge is thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="my-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSendMessage} className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            !profile || !profile.isComplete
              ? "Type your answer here..."
              : "Ask anything (e.g. What does high ALT mean? Is 130/85 BP normal?)..."
          }
          disabled={isSending}
          className="flex-grow text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition"
        />

        <button
          type="submit"
          disabled={isSending || !inputText.trim()}
          className="bg-teal-600 hover:bg-teal-700 text-white p-2.5 sm:px-4 sm:py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
};
