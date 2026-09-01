import React, { useState, useRef } from "react";
import { User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { LabScanData } from "../types";
import { UploadCloud, RefreshCw, AlertCircle, FileText, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

interface LabReportScannerProps {
  user: User;
  onScanSaved: () => void;
}

export const LabReportScanner: React.FC<LabReportScannerProps> = ({ user, onScanSaved }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<LabScanData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    // Supported formats check
    const supported = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!supported.includes(file.type) && !file.type.startsWith("image/")) {
      setErrorMsg("Please upload a supported image file (JPEG, PNG, WebP) or PDF.");
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    setScanResult(null);

    // Create preview if image
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }

    try {
      // 1. Read file as base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read file as string"));
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // 2. Obtain Firebase ID Token
      const token = await user.getIdToken();

      // 3. Send to server-side API route
      const response = await fetch("/api/analyze-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType: file.type || "image/jpeg",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to analyze lab report.");
      }

      const result: LabScanData = await response.json();
      setScanResult(result);

      // 4. Save to Firestore collection: /users/{userId}/health_logs
      let derivedMoodStatus: "normal" | "monitor" | "alert" = "normal";
      if (Array.isArray(result.metrics)) {
        if (result.metrics.some((m) => m.status === "alert")) {
          derivedMoodStatus = "alert";
        } else if (result.metrics.some((m) => m.status === "monitor")) {
          derivedMoodStatus = "monitor";
        }
      }

      const sanitizedMetrics = (result.metrics || []).map((m) => ({
        metricName: String(m.metricName || "Test"),
        value: String(m.value || "N/A"),
        status: m.status === "alert" || m.status === "monitor" ? m.status : "normal",
        explanation: String(m.explanation || ""),
      }));

      const sanitizedDoc = {
        type: "lab_scan",
        timestamp: serverTimestamp(),
        plainSummary: String(result.plainSummary || "Lab report analysis"),
        metrics: sanitizedMetrics,
        doctorQuestions: Array.isArray(result.doctorQuestions) ? result.doctorQuestions : [],
        moodStatus: derivedMoodStatus,
      };

      const userLogsRef = collection(db, "users", user.uid, "health_logs");
      await addDoc(userLogsRef, sanitizedDoc);

      onScanSaved();
    } catch (err: any) {
      console.error("Analysis or save failed:", err);
      setErrorMsg(
        err.message?.includes("trouble reading") || err.message?.includes("parse")
          ? "We had trouble reading this report. Please try uploading a clearer image."
          : err.message || "Connection error. Please check your internet and try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setErrorMsg(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div id="lab-report-scanner-card" className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <span>📸</span> Scan Your Lab Report
          </h2>
          <p className="text-xs text-slate-400">
            Upload blood tests, prescriptions, or diagnostic reports for plain-language analysis
          </p>
        </div>
        <div className="flex items-center gap-2">
          {scanResult ? (
            <button
              onClick={resetScanner}
              className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full font-medium transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Scan Another</span>
            </button>
          ) : (
            <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              ✅ Ready to Scan
            </div>
          )}
        </div>
      </div>

      {/* UPLOAD ZONE */}
      {!scanResult && !isProcessing && (
        <div
          id="dropzone-area"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center ${
            dragActive
              ? "border-teal-500 bg-teal-50/50"
              : "border-slate-300 bg-slate-50 hover:bg-slate-100"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <div className="p-2.5 bg-white rounded-full shadow-xs mb-2 border border-slate-200 text-teal-600">
            <UploadCloud className="w-6 h-6 stroke-[1.75]" />
          </div>
          <p className="text-slate-700 font-medium text-sm">
            Drag and drop your report here
          </p>
          <p className="text-slate-400 text-xs mt-0.5">or</p>
          <span className="text-teal-600 text-xs font-semibold underline underline-offset-2 mt-0.5 hover:text-teal-700">
            Browse Files
          </span>
          <p className="text-[10px] text-slate-400 mt-2">
            Supports JPEG, PNG, WebP, PDF (e.g. CBC, Metabolic Panel, Lipid Profiles)
          </p>
        </div>
      )}

      {/* PROCESSING STATE */}
      {isProcessing && (
        <div className="border border-teal-100 rounded-xl p-8 text-center bg-teal-50/40 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-3" />
          <p className="text-slate-800 font-medium text-sm">
            Analyzing your report with AI...
          </p>
          <p className="text-slate-400 text-[11px] mt-1">
            Extracting biomarkers, clinical units, reference ranges, and doctor guidance
          </p>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Notice</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="underline font-medium text-red-800 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* RENDERING THE RESULTS */}
      {scanResult && (
        <div className="space-y-4">
          {/* Optional image thumbnail preview */}
          {previewUrl && (
            <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
              <img
                src={previewUrl}
                alt="Report scan preview"
                className="w-10 h-10 object-cover rounded-lg border border-slate-200"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 truncate">Uploaded Document Analyzed</p>
                <p className="text-[10px] text-slate-400 truncate">Processed securely through WellBridge AI Multimodal Vision</p>
              </div>
            </div>
          )}

          {/* 1. SUMMARY CARD */}
          <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-100">
            <p className="text-[10px] uppercase font-bold text-teal-600 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Report Summary
            </p>
            <p className="text-xs text-teal-800 leading-relaxed">
              {scanResult.plainSummary}
            </p>
          </div>

          {/* 2. HEALTH METRIC CARDS GRID */}
          {scanResult.metrics && scanResult.metrics.length > 0 && (
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
                Biomarkers & Results
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {scanResult.metrics.map((metric, idx) => {
                  let borderClass = "border-emerald-200";
                  let badgeClass = "bg-emerald-50 text-emerald-700";
                  let badgeLabel = "✅ " + metric.value;

                  if (metric.status === "monitor") {
                    borderClass = "border-amber-200";
                    badgeClass = "bg-amber-50 text-amber-700";
                    badgeLabel = "⚠️ " + metric.value;
                  } else if (metric.status === "alert") {
                    borderClass = "border-red-200";
                    badgeClass = "bg-red-50 text-red-700";
                    badgeLabel = "🔴 " + metric.value;
                  }

                  return (
                    <div
                      key={idx}
                      className={`flex flex-col justify-between p-2.5 bg-white border ${borderClass} rounded-lg shadow-2xs`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-700">
                          {metric.metricName}
                        </span>
                        <span className={`text-[10px] ${badgeClass} px-2 py-0.5 rounded font-bold whitespace-nowrap`}>
                          {badgeLabel}
                        </span>
                      </div>
                      {metric.explanation && (
                        <p className="text-[11px] text-slate-500 leading-tight mt-1.5 pt-1.5 border-t border-slate-100">
                          {metric.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. DOCTOR QUESTIONS CARD */}
          {scanResult.doctorQuestions && scanResult.doctorQuestions.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
              <p className="text-[10px] uppercase font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                <span>❓</span> Recommended Questions for Your Doctor
              </p>
              <ul className="space-y-1.5">
                {scanResult.doctorQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700 text-xs leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
