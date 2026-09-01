import React, { useState } from "react";
import { User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ChatMessage, JournalReflectionData } from "../types";
import { Sparkles, Send, AlertCircle, Loader2 } from "lucide-react";

interface SymptomJournalProps {
  user: User;
  onJournalSaved: () => void;
}

export const SymptomJournal: React.FC<SymptomJournalProps> = ({ user, onJournalSaved }) => {
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ChatMessage[]>([]);

  const handleReflect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;

    const userInput = inputText.trim();
    setErrorMsg(null);
    setIsProcessing(true);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      text: userInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Add user message immediately
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setInputText("");

    try {
      // 1. Get Firebase ID token
      const token = await user.getIdToken();

      // 2. Format previous turns for context
      const historyContext = conversation.map((c) => ({
        role: c.role,
        text: c.text,
      }));

      // 3. Call server API
      const response = await fetch("/api/journal-reflect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userInput: userInput,
          conversationHistory: historyContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to process reflection with AI.");
      }

      const reflectionData: JournalReflectionData = await response.json();

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: reflectionData.reflection,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reflectionData: reflectionData,
      };

      setConversation([...updatedConversation, aiMessage]);

      // 4. Save to Firestore /users/{userId}/health_logs
      const sanitizedDoc = {
        type: "journal",
        timestamp: serverTimestamp(),
        userText: userInput,
        aiReflection: String(reflectionData.reflection || ""),
        summary: String(reflectionData.summary || ""),
        tags: Array.isArray(reflectionData.tags) ? reflectionData.tags : [],
        mood: reflectionData.mood || "resting",
      };

      const userLogsRef = collection(db, "users", user.uid, "health_logs");
      await addDoc(userLogsRef, sanitizedDoc);

      onJournalSaved();
    } catch (err: any) {
      console.error("Journal reflection failed:", err);
      setErrorMsg(err.message || "Failed to connect to health reflection service. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="daily-symptom-journal-card" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col flex-grow">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <span>📝</span> How Are You Feeling Today?
        </h2>
        <p className="text-xs text-slate-400">
          Share symptoms, energy, pain, or medication effects
        </p>
      </div>

      {/* CONVERSATION HISTORY (Chat Bubbles) */}
      <div className="flex flex-col gap-3 flex-grow max-h-[440px] overflow-y-auto pr-1">
        {conversation.length === 0 ? (
          <div className="py-6 px-4 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 font-medium">No reflections logged yet today.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Type how you're feeling below to receive contextual health guidance.
            </p>
          </div>
        ) : (
          conversation.map((msg) => {
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
            } else {
              const refl = msg.reflectionData;
              return (
                <div key={msg.id} className="flex justify-start">
                  <div className="bg-white border-l-4 border-teal-500 rounded-2xl rounded-bl-none p-3 text-sm text-slate-700 max-w-[85%] shadow-xs border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-teal-700">
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      <span>WellBridge Companion</span>
                    </div>

                    <p className="leading-relaxed">{msg.text}</p>

                    {/* Metadata below reflection */}
                    {refl && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2">
                        {refl.summary && (
                          <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600 italic">
                            <span className="font-semibold text-slate-700 not-italic block text-[10px] uppercase mb-0.5">Key Health Observation:</span>
                            {refl.summary}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                          {/* Tags */}
                          {refl.tags && refl.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {refl.tags.map((tag, tIdx) => (
                                <span
                                  key={tIdx}
                                  className="text-[10px] bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Mood Pill */}
                          {refl.mood && (
                            <div>
                              {refl.mood === "energized" && (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                                  💚 Energized
                                </span>
                              )}
                              {refl.mood === "resting" && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                                  🧡 Resting
                                </span>
                              )}
                              {refl.mood === "in_pain" && (
                                <span className="text-[10px] bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1">
                                  ❤️ In Pain
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <span className="text-[10px] text-slate-400 block text-right mt-1 font-medium">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            }
          })
        )}
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="my-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="underline font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* INPUT FORM */}
      <form onSubmit={handleReflect} className="mt-3 relative">
        <textarea
          id="symptom-journal-input"
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isProcessing}
          placeholder="Write your reflection (e.g. feeling sluggish after vitamins, morning headaches, low energy)..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-28 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <button
            id="journal-submit-btn"
            type="submit"
            disabled={!inputText.trim() || isProcessing}
            className="bg-teal-600 text-white px-4 py-1.5 rounded-lg text-xs font-medium shadow-xs hover:bg-teal-700 transition flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <span>Reflect with AI ✨</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
