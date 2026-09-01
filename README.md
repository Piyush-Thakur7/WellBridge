# WellBridge AI — Patient Health Journal & Multimodal Medical Report Demystifier

WellBridge AI is an enterprise-grade patient healthcare journal, interactive health companion, and multimodal lab report analyzer built with React, Tailwind CSS, Google Cloud Firestore, Firebase Authentication, and the Gemini 3.6/3.7 Flash API.

---

## 🛡️ Agentic Threat Modeling & Countermeasures

| Threat Zone | Identified Attack Vector | Production Countermeasure |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious PDF/Image payloads, oversized buffer injection | Strict schema validation, base64 payload size limiting (25MB max), and non-executable sanitization |
| **Planning & Reasoning** | Prompt injection in patient symptoms or OCR test fields | Defensive prompt isolation; user input treated strictly as data literals rather than instructions |
| **Tool & AI Execution** | Gemini rate limits (`429`), temporary service unavailability (`503`) | Resilient model fallback ladder (`gemini-3.6-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-flash-latest` ➔ `gemini-3.7-flash`) |
| **Memory & State** | Cross-user patient data leakage, unauthorized read/write | Strict owner-bound Firestore security rules (`request.auth.uid == userId`) and zero insecure default rules |
| **Inter-System / Secrets** | Client-side API key leakage, token forgery | Firebase ID token verification server-side; `GEMINI_API_KEY` stored strictly in Secret Manager / backend environment variables |

---

## 🔒 Firestore Security Rules

Deploy the following security rules to protect patient health records and profile collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 🔑 Secret Management Setup (Google Cloud Secret Manager)

Store your Gemini API key in Google Cloud Secret Manager and grant access to the Cloud Run runtime service account:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 🚀 Google Cloud Run Deployment

Deploy the full-stack container service to Google Cloud Run:

```bash
# 1. Build and deploy container to Cloud Run
gcloud run deploy wellbridge-ai \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --update-labels=dev-tutorial=cloud-run-ai-challenge

# 2. Apply campaign verification label binding
gcloud run services update wellbridge-ai \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 📋 Comprehensive Functional Stability & Verification Walkthrough

The following test walkthrough cases cover all user interactions and workflows:

### Test Case 1: Landing Page & Navigation Bar
1. **Initial Visit**: Navigate to root URL. Verify the fixed top navbar with WellBridge logo, brand title, and quick-scroll navigation links (**Features**, **How It Works**, **Trust**, **FAQ**), plus the **Get Started** button.
2. **Smooth Scrolling**: Click **Features**, **How It Works**, **Trust**, and **FAQ** to verify animated scroll positioning.
3. **Federated Sign-In**: Click **Continue with Google** or **Get Started**. Authenticate through the Firebase Google Auth popup.
4. **State Transition**: Confirm immediate redirect to the private patient dashboard with user profile picture and email displayed in the header.

### Test Case 2: AI Health Companion Chat (Interactive Health Assistant)
1. **First-Time Setup Flow**: Locate the **💬 Your Health Companion** card positioned directly between Doctor Visit Brief and Lab Report Scanner.
2. **Proactive Questions**: Observe the initial question asking for age and gender. Answer with e.g. *"34, female"*.
3. **Progressive Profile Building**: Answer conditions (*"mild asthma"*), medications (*"albuterol inhaler"*), allergies (*"penicillin"*), and lifestyle (*"moderate active"*).
4. **Profile Persistence**: Verify status badge updates to **Health Profile: Complete ✅** and is saved under `/users/{userId}/health_profile/current`.
5. **General Q&A**: Ask a health question (e.g. *"Can asthma symptoms worsen during cold weather?"*). Confirm the companion answers warmly, cites baseline profile context, suggests questions for the doctor, and appends the mandatory medical disclaimer: *"ℹ️ This is general wellness information, not medical advice."*

### Test Case 3: Multimodal Lab Report Scanner
1. **Upload Trigger**: Drag and drop or browse a blood test report (e.g. CBC or Metabolic panel in PNG/JPEG/PDF format).
2. **Analysis Progress**: Verify the spinning teal loader and "Analyzing your report with AI..." indicator.
3. **Structured Rendering**: Check that the **Report Summary** card renders in teal, the **Your Results** grid displays biomarkers with correct status pill colors (Normal ✅, Monitor ⚠️, Discuss with Doctor 🔴), and 3 doctor questions are listed.
4. **Data Isolation & Save**: Confirm the scanned report is saved to `/users/{userId}/health_logs` and appears immediately in the **Health History** sidebar.

### Test Case 4: Daily Symptom & Wellness Journal
1. **Input Submission**: Type a symptom entry (e.g., *"I felt dizzy this morning after taking my blood pressure medicine. My energy was low until afternoon..."*) and click **Reflect with AI ✨**.
2. **Empathetic AI Feedback**: Verify chat bubble appears with warm reflection, executive observation summary, hashtag wellness tags, and mood pill (`💚 Energized`, `🧡 Resting`, or `❤️ In Pain`).
3. **Multi-Turn Context**: Type a follow-up message and confirm the AI maintains conversational context across turns.

### Test Case 5: Doctor Visit Brief Generator
1. **One-Click Generation**: Click **📋 Generate Doctor Visit Brief**.
2. **Data Aggregation**: Verify the past 30-day health logs and lab scans are compiled into a 4-section structured physician brief.
3. **Print & Save**: Click **🖨️ Print Brief** to trigger browser print dialog with clean, un-nested print layout. Click **Save Brief** to persist to Firestore.

### Test Case 6: Real-time Health History Sidebar
1. **Filter Verification**: Click filter chips (**All**, **🔬 Lab Scans**, **📝 Journal**, **📋 Briefs**) and verify the list updates.
2. **Detail Modal**: Click on any history card to open the expanded modal with full biomarkers or reflection details.
3. **Deletion**: Click the trash icon to delete an entry and verify immediate Firestore synchronization.
