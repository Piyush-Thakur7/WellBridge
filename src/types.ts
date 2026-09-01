export type MoodType = "energized" | "resting" | "in_pain" | "normal" | "monitor" | "alert";

export interface MetricItem {
  metricName: string;
  value: string;
  status: "normal" | "monitor" | "alert";
  explanation: string;
}

export interface LabScanData {
  plainSummary: string;
  metrics: MetricItem[];
  doctorQuestions: string[];
}

export interface JournalReflectionData {
  reflection: string;
  summary: string;
  tags: string[];
  mood: "energized" | "resting" | "in_pain";
}

export interface HealthLogEntry {
  id?: string;
  type: "lab_scan" | "journal" | "doctor_brief";
  timestamp: any; // Firestore Timestamp or Date
  createdAt?: string;

  // For lab_scan
  plainSummary?: string;
  metrics?: MetricItem[];
  doctorQuestions?: string[];
  moodStatus?: "normal" | "monitor" | "alert";

  // For journal
  userText?: string;
  aiReflection?: string;
  summary?: string;
  tags?: string[];
  mood?: "energized" | "resting" | "in_pain";

  // For doctor_brief
  briefContent?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
  reflectionData?: JournalReflectionData;
}

export interface HealthProfile {
  userId: string;
  age?: string;
  gender?: string;
  conditions?: string;
  medications?: string;
  allergies?: string;
  lifestyle?: string;
  isComplete: boolean;
  updatedAt?: any;
}

