import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { HealthLogEntry } from "../types";
import { FileText, BookOpen, ClipboardList, X, Trash2, Calendar, Sparkles } from "lucide-react";
import { WellBridgeLogo } from "./WellBridgeLogo";

interface HealthHistorySidebarProps {
  user: User;
  refreshTrigger: number;
}

export const HealthHistorySidebar: React.FC<HealthHistorySidebarProps> = ({ user, refreshTrigger }) => {
  const [filter, setFilter] = useState<"all" | "lab_scan" | "journal" | "doctor_brief">("all");
  const [logs, setLogs] = useState<HealthLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<HealthLogEntry | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const logsRef = collection(db, "users", user.uid, "health_logs");
    const q = query(logsRef, orderBy("timestamp", "desc"), limit(50));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetchedLogs: HealthLogEntry[] = [];
        snapshot.forEach((docSnap) => {
          fetchedLogs.push({
            id: docSnap.id,
            ...(docSnap.data() as HealthLogEntry),
          });
        });
        setLogs(fetchedLogs);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore real-time history error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, refreshTrigger]);

  const filteredLogs = logs.filter((item) => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  const handleDeleteEntry = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this health record?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "health_logs", entryId));
      if (selectedEntry?.id === entryId) {
        setSelectedEntry(null);
      }
    } catch (err) {
      console.error("Failed to delete log entry:", err);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Recent";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSummaryText = (item: HealthLogEntry) => {
    if (item.type === "lab_scan") {
      return item.plainSummary || "Lab Report Analysis";
    }
    if (item.type === "journal") {
      return item.summary || item.userText || "Health Journal Entry";
    }
    if (item.type === "doctor_brief") {
      return item.summary || "30-Day Doctor Visit Clinical Brief";
    }
    return "Health Log Record";
  };

  return (
    <div id="health-history-sidebar" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col h-full">
      {/* Title */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        📊 Health History
      </h2>

      {/* Filter Chips Row */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilter("all")}
          className={`text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${
            filter === "all"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("lab_scan")}
          className={`text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${
            filter === "lab_scan"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          🔬 Lab Scans
        </button>
        <button
          onClick={() => setFilter("journal")}
          className={`text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${
            filter === "journal"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          📝 Journal
        </button>
        <button
          onClick={() => setFilter("doctor_brief")}
          className={`text-[11px] font-bold px-4 py-1.5 rounded-full whitespace-nowrap transition cursor-pointer ${
            filter === "doctor_brief"
              ? "bg-teal-600 text-white shadow-xs"
              : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          📋 Briefs
        </button>
      </div>

      {/* HISTORY LIST */}
      <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 max-h-[580px]">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading health records...
          </div>
        ) : filteredLogs.length === 0 ? (
          /* EMPTY STATE */
          <div className="py-12 text-center px-4 flex flex-col items-center justify-center">
            <div className="p-3 bg-teal-50 rounded-full mb-2 border border-teal-100">
              <WellBridgeLogo size={28} className="w-7 h-7 opacity-80" />
            </div>
            <p className="text-slate-600 font-medium text-xs">No health logs yet</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[180px]">
              Start by scanning a lab report or writing in your journal
            </p>
          </div>
        ) : (
          filteredLogs.map((item) => {
            const rawSummary = getSummaryText(item);
            const truncatedSummary = rawSummary.length > 55 ? rawSummary.slice(0, 55) + "..." : rawSummary;

            let dotColor = "bg-emerald-500";
            if (item.type === "lab_scan") {
              if (item.moodStatus === "alert") dotColor = "bg-red-500";
              else if (item.moodStatus === "monitor") dotColor = "bg-amber-500";
            } else if (item.type === "journal") {
              if (item.mood === "in_pain") dotColor = "bg-red-500";
              else if (item.mood === "resting") dotColor = "bg-amber-500";
            }

            let typeLabel = "LAB SCAN";
            if (item.type === "journal") typeLabel = "JOURNAL";
            if (item.type === "doctor_brief") typeLabel = "BRIEF";

            return (
              <div
                key={item.id}
                onClick={() => setSelectedEntry(item)}
                className="group p-3 border border-slate-100 rounded-xl hover:border-teal-200 hover:shadow-xs transition-all cursor-pointer bg-slate-50/50 flex items-center gap-3"
              >
                {/* Left Type Icon */}
                <span className="text-sm bg-white w-8 h-8 flex items-center justify-center rounded-full border border-slate-100 shrink-0">
                  {item.type === "lab_scan" && "📸"}
                  {item.type === "journal" && "📝"}
                  {item.type === "doctor_brief" && "📋"}
                </span>

                {/* Middle Content */}
                <div className="flex-grow overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate group-hover:text-teal-700 transition">
                    {truncatedSummary}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter mt-0.5">
                    {formatDate(item.timestamp)} • {typeLabel}
                  </p>
                </div>

                {/* Status indicator dot */}
                <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
              </div>
            );
          })
        )}
      </div>

      {/* Footer Indicator */}
      <div className="mt-auto pt-4 text-center">
        <p className="text-[10px] text-slate-300 italic">End of recent history</p>
      </div>

      {/* DETAIL MODAL FOR SELECTED ENTRY */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {selectedEntry.type === "lab_scan" && "📸"}
                  {selectedEntry.type === "journal" && "📝"}
                  {selectedEntry.type === "doctor_brief" && "📋"}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    {selectedEntry.type === "lab_scan" && "Lab Report Analysis"}
                    {selectedEntry.type === "journal" && "Wellness Reflection Entry"}
                    {selectedEntry.type === "doctor_brief" && "30-Day Doctor Visit Brief"}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    {formatDate(selectedEntry.timestamp)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedEntry.id && (
                  <button
                    onClick={(e) => handleDeleteEntry(selectedEntry.id!, e)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body Based on Type */}
            <div className="mt-4 space-y-3.5 text-xs">
              {/* Lab Scan Body */}
              {selectedEntry.type === "lab_scan" && (
                <>
                  <div className="bg-teal-50 rounded-xl p-3.5 border border-teal-100">
                    <p className="text-[10px] uppercase font-bold text-teal-600 mb-1">Report Summary</p>
                    <p className="text-teal-800 text-xs leading-relaxed">{selectedEntry.plainSummary}</p>
                  </div>

                  {selectedEntry.metrics && selectedEntry.metrics.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">Biomarkers & Test Metrics</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedEntry.metrics.map((m, idx) => (
                          <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-medium text-xs text-slate-700">{m.metricName}</span>
                              <span className="text-[10px] font-bold text-slate-600 uppercase">{m.status}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-900 mt-1">{m.value}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{m.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEntry.doctorQuestions && selectedEntry.doctorQuestions.length > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-600 mb-1.5">Doctor Questions</p>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {selectedEntry.doctorQuestions.map((q, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-teal-600 font-bold">•</span>
                            <span>{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {/* Journal Body */}
              {selectedEntry.type === "journal" && (
                <>
                  <div className="bg-slate-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Your Journal Entry</p>
                    <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap">{selectedEntry.userText}</p>
                  </div>

                  <div className="bg-white border-l-4 border-teal-500 rounded-xl p-3 border-y border-r border-slate-100">
                    <p className="text-[10px] font-bold uppercase text-teal-700 flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3" /> WellBridge Companion Reflection
                    </p>
                    <p className="text-slate-700 text-xs leading-relaxed">{selectedEntry.aiReflection}</p>

                    {selectedEntry.summary && (
                      <div className="mt-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-600 italic">
                        <strong>Health Observation:</strong> {selectedEntry.summary}
                      </div>
                    )}

                    {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {selectedEntry.tags.map((t, idx) => (
                          <span key={idx} className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Doctor Brief Body */}
              {selectedEntry.type === "doctor_brief" && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2.5 leading-relaxed whitespace-pre-line">
                  {selectedEntry.briefContent}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
