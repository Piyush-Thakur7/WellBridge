import React, { useState } from "react";
import { User } from "firebase/auth";
import { collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { HealthLogEntry } from "../types";
import { Printer, BookmarkPlus, Loader2, Sparkles, AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

interface DoctorBriefGeneratorProps {
  user: User;
  onBriefSaved: () => void;
}

export const DoctorBriefGenerator: React.FC<DoctorBriefGeneratorProps> = ({ user, onBriefSaved }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [briefContent, setBriefContent] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const generateBrief = async () => {
    setErrorMsg(null);
    setIsGenerating(true);
    setSaveSuccess(false);

    try {
      // 1. Query Firestore for logs in past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoTimestamp = Timestamp.fromDate(thirtyDaysAgo);

      const logsRef = collection(db, "users", user.uid, "health_logs");
      // Query without complex compound index requirements first to avoid index build blocks
      const q = query(
        logsRef,
        orderBy("timestamp", "desc")
      );

      const snapshot = await getDocs(q);
      const entries: HealthLogEntry[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as HealthLogEntry;
        // Filter in memory for past 30 days
        const docDate = data.timestamp?.toDate ? data.timestamp.toDate() : new Date();
        if (docDate >= thirtyDaysAgo) {
          entries.push({ id: docSnap.id, ...data });
        }
      });

      // 2. Compile all entries into structured text
      let compiledDataText = "";
      if (entries.length === 0) {
        compiledDataText = "No prior health logs recorded in the last 30 days. Please generate a baseline doctor discussion checklist based on routine wellness monitoring.";
      } else {
        compiledDataText = entries.map((entry, idx) => {
          const dateStr = entry.timestamp?.toDate ? entry.timestamp.toDate().toLocaleDateString() : "Recent";
          if (entry.type === "lab_scan") {
            const metricsSummary = (entry.metrics || [])
              .map((m) => `${m.metricName}: ${m.value} (${m.status}) - ${m.explanation}`)
              .join("; ");
            return `[${dateStr}] LAB SCAN: Summary: ${entry.plainSummary}. Metrics: ${metricsSummary}`;
          } else if (entry.type === "journal") {
            return `[${dateStr}] JOURNAL: Patient wrote: "${entry.userText}". Reflection summary: ${entry.summary}. Mood: ${entry.mood}. Tags: ${(entry.tags || []).join(", ")}`;
          } else if (entry.type === "doctor_brief") {
            return `[${dateStr}] PREVIOUS BRIEF: ${entry.briefContent?.slice(0, 150)}...`;
          }
          return `[${dateStr}] Log Entry: ${entry.summary || entry.plainSummary || ""}`;
        }).join("\n\n");
      }

      // 3. Obtain Firebase ID token & call server API
      const token = await user.getIdToken();
      const response = await fetch("/api/generate-brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          compiledData: compiledDataText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate doctor visit brief.");
      }

      const resData = await response.json();
      setBriefContent(resData.briefContent);
      setIsOpen(true);
    } catch (err: any) {
      console.error("Doctor brief error:", err);
      setErrorMsg(err.message || "Failed to generate brief. Please check connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSave = async () => {
    if (!briefContent || isSaving) return;
    setIsSaving(true);
    try {
      const sanitizedDoc = {
        type: "doctor_brief",
        timestamp: serverTimestamp(),
        briefContent: String(briefContent),
        summary: "30-Day Doctor Visit Clinical Brief",
        mood: "resting",
      };

      const logsRef = collection(db, "users", user.uid, "health_logs");
      await addDoc(logsRef, sanitizedDoc);

      setSaveSuccess(true);
      onBriefSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save brief error:", err);
      setErrorMsg(err.message || "Failed to save brief to health history.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="doctor-brief-section" className="space-y-4">
      {/* Compact Teal Action Button */}
      <div className="flex items-center justify-between">
        <button
          id="generate-doctor-brief-btn"
          onClick={generateBrief}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 bg-teal-600 text-white py-2 px-4 rounded-xl font-medium hover:bg-teal-700 shadow-xs transition-all text-xs sm:text-sm cursor-pointer disabled:opacity-75 disabled:pointer-events-none"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Compiling 30-day health records...</span>
            </>
          ) : (
            <>
              <span className="text-sm">📋</span>
              <span>Generate Doctor Visit Brief</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="underline font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* RENDER BRIEF CARD */}
      {briefContent && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs print:border-none print:shadow-none print:p-0">
          {/* Header Row with Title and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full">
                Physician Ready
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                30-Day Doctor Visit Clinical Brief
              </h3>
              <p className="text-[11px] text-slate-400">
                Generated for {user.displayName || "Patient"} • {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition cursor-pointer"
                title="Print this brief for your clinic visit"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition cursor-pointer disabled:opacity-50"
                title="Save brief to Health History"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saveSuccess ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <BookmarkPlus className="w-3.5 h-3.5" />
                )}
                <span>{saveSuccess ? "Saved!" : "Save"}</span>
              </button>
            </div>
          </div>

          {/* Formatted Markdown/Structured Content Display */}
          <div className="mt-4 space-y-4 text-slate-700 text-xs sm:text-sm leading-relaxed">
            {briefContent.split("\n\n").map((block, idx) => {
              const trimmed = block.trim();
              if (
                trimmed.startsWith("1.") ||
                trimmed.startsWith("2.") ||
                trimmed.startsWith("3.") ||
                trimmed.startsWith("4.") ||
                trimmed.includes("CHIEF SYMPTOMS") ||
                trimmed.includes("MEDICATION & SIDE EFFECTS") ||
                trimmed.includes("LAB RESULTS HIGHLIGHTS") ||
                trimmed.includes("RECOMMENDED DISCUSSION POINTS")
              ) {
                const lines = trimmed.split("\n");
                const heading = lines[0];
                const rest = lines.slice(1);
                return (
                  <div key={idx} className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 pb-1 mb-1.5 border-b border-slate-200">
                      {heading.replace(/[*#]/g, "")}
                    </h4>
                    <div className="space-y-1 text-slate-600 text-xs">
                      {rest.map((line, lIdx) => (
                        <p key={lIdx} className="leading-relaxed">
                          {line.replace(/[*#]/g, "")}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }
              return (
                <p key={idx} className="whitespace-pre-line text-slate-600 text-xs">
                  {trimmed.replace(/[*#]/g, "")}
                </p>
              );
            })}
          </div>

          {/* Medical Disclaimer on Brief Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 italic">
              ℹ️ WellBridge AI provides patient-summarized observations. It does not replace professional diagnostic judgment. Prepared for physician consultation review.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
