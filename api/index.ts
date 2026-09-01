import express from "express";

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

async function generateWithGemini(prompt: string, inlineData?: { mimeType: string; data: string }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing on Vercel.");
  }

  const parts: any[] = [];
  if (inlineData) {
    parts.push({
      inline_data: {
        mime_type: inlineData.mimeType,
        data: inlineData.data,
      }
    });
  }
  parts.push({ text: prompt });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts }] }),
  });

  const data = await response.json();

  if (!response.ok) {
    const msg = data?.error?.message || `Google API error (HTTP ${response.status})`;
    console.error("Gemini API Error details:", JSON.stringify(data));
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}

// Middleware: Authenticate User JWT
const authenticateUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload && (payload.user_id || payload.sub || payload.uid)) {
          (req as any).user = {
            uid: payload.user_id || payload.sub || payload.uid,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
          };
        }
      }
    } catch (err) {
      // ignore
    }
  }
  next();
};

const router = express.Router();

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.post("/analyze-report", authenticateUser, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64) {
      res.status(400).json({ error: "Missing imageBase64 data in payload" });
      return;
    }

    const cleanBase64 = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const cleanMimeType = mimeType || "image/jpeg";

    const prompt = `You are a medical report analyzer for WellBridge AI. Analyze this medical lab report image carefully.

Return ONLY a valid JSON object (no markdown, no backticks, no extra text) with this exact structure:
{
  "plainSummary": "A 2-3 sentence reassuring explanation of the overall report in very simple language that a non-medical person can understand.",
  "metrics": [
    {
      "metricName": "Name of the test (e.g. Hemoglobin)",
      "value": "The value with unit (e.g. 14.2 g/dL)",
      "status": "normal OR monitor OR alert",
      "explanation": "One simple sentence explaining what this means for the patient"
    }
  ],
  "doctorQuestions": [
    "First specific question to ask the doctor based on findings",
    "Second specific question",
    "Third specific question"
  ]
}

Rules for status assignment:
- "normal": Value is within standard healthy reference range
- "monitor": Value is slightly outside range, not dangerous but worth watching
- "alert": Value is significantly abnormal, patient should discuss with doctor

If you cannot identify specific test values from the image, return:
{
  "plainSummary": "We could not clearly read specific test values from this image. Please try uploading a clearer photo.",
  "metrics": [],
  "doctorQuestions": ["Ask your doctor to walk you through this report with you"]
}`;

    const rawText = await generateWithGemini(prompt, {
      mimeType: cleanMimeType,
      data: cleanBase64,
    });

    let parsedData;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText.trim());
    } catch (parseError) {
      res.status(500).json({ error: "Failed to parse AI response into JSON", raw: rawText });
      return;
    }

    res.json(parsedData);
  } catch (err: any) {
    console.error("Lab scan API error:", err);
    res.status(500).json({ error: err?.message || "Internal server error analyzing report" });
  }
});

router.post("/journal-reflect", authenticateUser, async (req, res) => {
  try {
    const { userInput, conversationHistory } = req.body || {};
    if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
      res.status(400).json({ error: "Missing userInput in payload" });
      return;
    }

    let historyContext = "";
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      historyContext = `\nPrevious conversation turns:\n` + conversationHistory.map((turn: any) => {
        return `${turn.role === 'user' ? 'Patient' : 'WellBridge AI'}: ${turn.text}`;
      }).join("\n") + `\n`;
    }

    const prompt = `You are a compassionate health wellness companion for WellBridge AI. A patient has shared how they are feeling today. Respond with warmth and empathy.

Return ONLY a valid JSON object (no markdown, no backticks) with this structure:
{
  "reflection": "A warm, empathetic 2-3 sentence wellness reflection. Acknowledge their feelings. Offer one gentle, encouraging thought. End with one thoughtful follow-up question.",
  "summary": "A concise 2-sentence executive summary of their key health observations today.",
  "tags": ["tag1", "tag2", "tag3"],
  "mood": "energized OR resting OR in_pain"
}

For tags: choose 3 relevant health/wellness tags like: fatigue, hydration, pain, sleep, medication, anxiety, recovery, exercise, appetite, headache, nausea, stress, improvement
For mood: choose the single best match based on their overall tone.

${historyContext}
Patient's entry: ${userInput.trim()}`;

    const rawText = await generateWithGemini(prompt);
    let parsedData;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsedData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawText.trim());
    } catch (parseError) {
      res.status(500).json({ error: "Failed to parse AI reflection into JSON", raw: rawText });
      return;
    }

    res.json(parsedData);
  } catch (err: any) {
    console.error("Journal reflection API error:", err);
    res.status(500).json({ error: err?.message || "Internal server error reflecting on journal" });
  }
});

router.post("/generate-brief", authenticateUser, async (req, res) => {
  try {
    const { compiledData } = req.body || {};
    if (!compiledData || typeof compiledData !== "string") {
      res.status(400).json({ error: "Missing compiledData in payload" });
      return;
    }

    const prompt = `You are a medical document assistant for WellBridge AI. Compile the following patient health data from the past 30 days into a clean, structured Doctor Visit Brief.

Format the brief with these exact sections:
1. CHIEF SYMPTOMS & OBSERVATIONS — List the main symptoms and health observations the patient reported, with approximate dates
2. MEDICATION & SIDE EFFECTS — Any medication reactions or side effects mentioned
3. LAB RESULTS HIGHLIGHTS — Summary of any lab scan findings, especially any monitor or alert status metrics
4. RECOMMENDED DISCUSSION POINTS — 3-4 specific points the patient should discuss with their physician based on patterns in the data

Use professional but clear language. Be concise. This will be printed on one page.

Patient data from past 30 days:
${compiledData}`;

    const briefText = await generateWithGemini(prompt);
    res.json({ briefContent: briefText });
  } catch (err: any) {
    console.error("Generate brief API error:", err);
    res.status(500).json({ error: err?.message || "Internal server error generating brief" });
  }
});

router.post("/health-companion-chat", authenticateUser, async (req, res) => {
  try {
    const { message, conversationHistory, healthProfile } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "Missing message in payload" });
      return;
    }

    let profileContext = "No health profile provided yet.";
    if (healthProfile && typeof healthProfile === "object") {
      profileContext = `
Patient Health Profile:
- Age: ${healthProfile.age || "Not specified"}
- Gender: ${healthProfile.gender || "Not specified"}
- Medical Conditions: ${healthProfile.conditions || "None reported"}
- Medications / Supplements: ${healthProfile.medications || "None reported"}
- Known Allergies: ${healthProfile.allergies || "None reported"}
- Lifestyle Activity Level: ${healthProfile.lifestyle || "Not specified"}
`;
    }

    let historyContext = "";
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      historyContext = `\nConversation history:\n` + conversationHistory.slice(-8).map((turn: any) => {
        return `${turn.role === 'user' ? 'User' : 'WellBridge Companion'}: ${turn.text}`;
      }).join("\n") + `\n`;
    }

    const prompt = `You are the WellBridge AI Health Companion — a compassionate, empathetic, and knowledgeable health assistant.
You provide clear, personalized explanations tailored to the patient's baseline profile.

${profileContext}
${historyContext}
User's Question/Input: ${message.trim()}

Instructions:
1. Respond with warmth, clarity, empathy, and evidence-based health guidance tailored to their profile.
2. Answer their question directly in accessible plain language without medical jargon.
3. Where appropriate, proactively suggest 2-3 specific things or questions they might discuss at their next doctor checkup.
4. Keep the response concise (2-4 brief paragraphs or clean bullet points).

Your response:`;

    const aiReply = await generateWithGemini(prompt);
    res.json({ reply: aiReply.trim() });
  } catch (err: any) {
    console.error("Health companion chat API error:", err);
    res.status(500).json({ error: err?.message || "Internal server error in health companion chat" });
  }
});

app.use("/api", router);
app.use("/", router);

export default app;
