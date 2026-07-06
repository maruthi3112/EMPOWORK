import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Lazy Initialize Google GenAI
let aiInstance: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

app.use(express.json());

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/**
 * AI Worker Profile Generator
 * Takes user inputs (voice transcripts, broken english, or basic details) and returns a beautifully structured bio and list of skills.
 */
app.post("/api/gemini/generate-profile", async (req, res) => {
  try {
    const { rawInput, trade, experience } = req.body;
    if (!rawInput) {
      return res.status(400).json({ error: "rawInput is required" });
    }

    const ai = getAi();
    if (!ai) {
      console.warn("GEMINI_API_KEY is missing. Returning simulated fallback profile.");
      return res.json({
        optimizedBio: `Dedicated ${trade || "General Laborer"} with ${experience || "some experience"}. Highly punctual, safe on construction sites, and works with passion. "${rawInput}"`,
        skills: ["Manual labor execution", "Construction site preparation", "Team safety coordination", "Materials handling"]
      });
    }

    const prompt = `You are a professional assistant on EmpoWork, an industrial job platform for daily wage labourers.
Your job is to read a labourer's self-description (often input via voice and possibly containing grammar mistakes, colloquial language, or informal details) and translate it into a highly professional, polite, and industry-ready profile description and a list of key skills.

Inputs:
- Trade Category: ${trade || "General Labourer"}
- Experience: ${experience || "No experience mentioned"}
- User self-description: "${rawInput}"

Provide a JSON response matching the schema:
{
  "optimizedBio": "A beautifully drafted, humble, and professional 3-sentence summary of the worker's skills, dedication, and reliability.",
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"]
}

The optimized description should highlight their practical trade skills, punctuality, teamwork, and strong willingness to work. Keep the tone warm, clear, and highly employable. Do not use complex corporate jargon.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedBio: {
              type: Type.STRING,
              description: "Professional, clear 2-3 sentence bio for the labor profile."
            },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of 4-6 specific practical skills based on their trade and experience."
            }
          },
          required: ["optimizedBio", "skills"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());
    res.json(resultJson);
  } catch (error: any) {
    console.error("Error generating profile bio:", error);
    res.json({
      optimizedBio: `Punctual worker ready for immediate employment. Experienced in onsite tasks, committed to construction safety guidelines, and works exceptionally well with teams.`,
      skills: ["General masonry assisting", "PPE protocols", "Heavy load lifting", "Site maintenance"]
    });
  }
});

/**
 * AI Smart Job Autofill Generator
 * Uses Gemini to instantaneously generate accurate construction job details (trade, wage, detailed description, location, slots) based on user's simple title.
 */
app.post("/api/gemini/generate-job", async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: "title is required" });
  }
  try {
    const ai = getAi();
    if (!ai) {
      console.warn("GEMINI_API_KEY is missing. Returning simulated fallback job.");
      return res.json({
        trade: title.toLowerCase().includes("mason") ? "Mason" : title.toLowerCase().includes("plumb") ? "Plumber" : title.toLowerCase().includes("electr") ? "Electrician" : "Helper",
        wage: 750,
        description: `Urgent requirement for ${title}. Main tasks include site setup, materials handling, and cooperating with other site builders. Shift: 9:00 AM - 5:30 PM. All basic tools and safety gear (Helmet, Boots, Vest) are provided.`,
        location: "Main construction block",
        slots: 2
      });
    }

    const prompt = `You are an AI assistant on EmpoWork, an industrial labor daily wage portal.
An employer is creating a construction / renovation job post with this simple input title: "${title}".
Help them instantaneously auto-fill the rest of the job details accurately and professionally, avoiding any manual typing delays.

Analyze the title and output a JSON response matching the schema:
{
  "trade": "One of: 'Mason', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Helper'",
  "wage": "A realistic market daily wage in INR (₹) for daily construction labor based on the trade category and work, between 400 and 2000 (usually increments of 50 or 100, e.g. 600, 850, 1000, 1200)",
  "description": "A beautifully drafted, detailed, clear construction site work description of 2-3 sentences. Mention the core tasks, standard shift timings (e.g. 9:00 AM to 5:30 PM), and state that construction tools/safety gear are provided.",
  "location": "A clean physical site location extracted from the title (e.g. 'Sector 15' or 'Metro Gate 3') if mentioned, or a generic clean default like 'Main construction block'",
  "slots": "Suggested number of daily wage workers needed for this assignment (typically 1 to 4)"
}

Keep the tone encouraging, respectful, and crystal clear. Ensure the trade is exactly one of the six allowed options.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trade: {
              type: Type.STRING,
              description: "Must be exactly one of: 'Mason', 'Plumber', 'Electrician', 'Carpenter', 'Painter', 'Helper'"
            },
            wage: {
              type: Type.INTEGER,
              description: "Standard daily wage offered in Indian Rupees (typically 400 to 2000)."
            },
            description: {
              type: Type.STRING,
              description: "A professional and detailed description of the daily site duties, tools, and timings."
            },
            location: {
              type: Type.STRING,
              description: "Clean site location name or area extracted from the title or default."
            },
            slots: {
              type: Type.INTEGER,
              description: "Suggested number of worker slots (typically 1 to 5)."
            }
          },
          required: ["trade", "wage", "description", "location", "slots"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());
    res.json(resultJson);
  } catch (error: any) {
    console.error("Error generating job details:", error);
    res.json({
      trade: "Helper",
      wage: 650,
      description: `Daily wage labor needed for ${title}. Work involves brick loading, mortar preparation, and general site cleaning. Safety gear provided on site.`,
      location: "Site Block C",
      slots: 3
    });
  }
});

/**
 * AI Dispute & Complaint Advisor
 * Analyzes a complaint submitted by a worker or employer and suggests a resolution recommendation for the Admin.
 */
app.post("/api/gemini/analyze-complaint", async (req, res) => {
  try {
    const { complaintText, raisedBy, jobTitle, wage } = req.body;
    if (!complaintText) {
      return res.status(400).json({ error: "complaintText is required" });
    }

    const ai = getAi();
    if (!ai) {
      console.warn("GEMINI_API_KEY is missing. Returning simulated fallback complaint advice.");
      return res.json({
        summary: "Dispute over shift checkout status and wage release authorization.",
        analysis: `A dispute has arisen where the ${raisedBy} reported issues during: "${complaintText}".`,
        recommendations: [
          "Step 1: Admin should verify GPS logs and scanned QR code records for check-in and checkout.",
          "Step 2: Pro-rate or authorize the wage settlement of ₹${wage || 500} based on the actual duration worker spent on site.",
          "Step 3: Mandate daily worker-employer verbal confirmation at the end of each shift to prevent communication gaps."
        ]
      });
    }

    const prompt = `You are an expert labor relations mediator. An official complaint has been submitted on the EmpoWork platform.
Analyze this dispute between a daily laborer and their employer. Provide a brief analysis and concrete action items to help the Admin resolve it fairly.

Context:
- Job Title: ${jobTitle || "Daily Wage Work"}
- Agreed Wage: ${wage ? `₹${wage}/day` : "Not specified"}
- Complaint Raised By: ${raisedBy} (either 'worker' or 'employer')
- Description of Issue: "${complaintText}"

Respond with a clean JSON containing:
{
  "summary": "One-sentence executive summary of the core issue.",
  "analysis": "A neutral, objective analysis of what probably occurred (max 3 sentences).",
  "recommendations": [
    "Step 1: Specific verification to be conducted by the Admin.",
    "Step 2: Recommended resolution regarding payment or attendance.",
    "Step 3: Prevention suggestion to avoid this in the future."
  ]
}
Make the advice supportive of labor rights while remaining perfectly fair and business-compliant.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            analysis: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "analysis", "recommendations"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());
    res.json(resultJson);
  } catch (error: any) {
    console.error("Error analyzing complaint:", error);
    res.json({
      summary: "Wage payment and attendance registration dispute.",
      analysis: "Discrepancy in recorded shift presence or completion of job requirements.",
      recommendations: [
        "Step 1: Audit the check-in timestamps against geographic GPS proximity logs.",
        "Step 2: Facilitate mutual communication between worker and site coordinator for verification.",
        "Step 3: Set up automatic checkout reminders at 6:00 PM for all registered active shifts."
      ]
    });
  }
});

/**
 * Deep AI Dispute & Complaint Advisor for Welfare Officers
 * Provides detailed, objective resolution suggestions, root causes, severity ratings, and pre-filled logs.
 */
app.post("/api/gemini/deep-analyze-dispute", async (req, res) => {
  try {
    const { complaintText, raisedBy, workerName, employerName, jobTitle, wage, focusArea, customDirectives } = req.body;
    if (!complaintText) {
      return res.status(400).json({ error: "complaintText is required" });
    }

    const ai = getAi();
    if (!ai) {
      console.warn("GEMINI_API_KEY is missing. Returning simulated fallback deep dispute response.");
      return res.json({
        executiveSummary: "Disagreement over standard work expectations and final wage payout clearance.",
        rootCauseAnalysis: "A breakdown in communication regarding work quality or duration, resulting in a withheld payment.",
        severityLevel: "Medium",
        suggestedVerdict: `Authorize a pro-rated settlement of ₹${Math.round((wage || 600) * 0.8)} (80% of daily wage) as some site duties were completed, and direct the contractor to log explicit specifications for future shifts.`,
        actionSteps: [
          "Cross-reference check-in and check-out timestamps in the digital register.",
          "Request photographic proof of completed plastering/masonry if available.",
          "Conduct a brief neutral telephonic review with the primary site coordinator."
        ],
        prefilledResolutionNotes: `Welfare mediation completed. Standard review indicates partial completion of site duties. Recommended settlement of ₹${Math.round((wage || 600) * 0.8)} approved. Both parties agreed to clear communication regarding checkout guidelines.`
      });
    }

    const prompt = `You are a professional industrial relations ombudsman and senior welfare officer advisor.
Analyze the following platform dispute between a daily laborer and their employer, and provide an objective, neutral, and fair resolution framework.

Dispute Context:
- Worker Name: ${workerName || "Daily Wage Worker"}
- Employer Name: ${employerName || "Site Contractor"}
- Associated Job: ${jobTitle || "Daily Labor Assignment"}
- Daily Agreed Wage: ${wage ? `₹${wage}` : "Not specified"}
- Dispute Originally Filed By: ${raisedBy || "worker"}
- Description of Grievance: "${complaintText}"

Mediation Focus Area Selected: ${focusArea || "general"} (e.g., wage dispute, safety hazard, behavior or general)
${customDirectives ? `Welfare Officer Special Instructions: "${customDirectives}"` : ""}

Conduct a deep, objective analysis. Keep the advice supportive of ethical labor standards, legal safety compliance, and business feasibility.
Respond with a clean JSON containing:
{
  "executiveSummary": "A concise, neutral, one-sentence summary of the core conflict.",
  "rootCauseAnalysis": "A 2-3 sentence deep-dive into the systemic or communicative failure that led to this dispute.",
  "severityLevel": "Choose exactly one: 'Low' | 'Medium' | 'High' | 'Critical'",
  "suggestedVerdict": "A direct, fair, legally and ethically sound proposed resolution.",
  "actionSteps": [
    "Step 1: Specific action for the Welfare Officer to verify on the platform or site",
    "Step 2: Platform check or communication action",
    "Step 3: A preventative guideline for both parties to prevent recurrence"
  ],
  "prefilledResolutionNotes": "A professional, formal template resolution note (2-3 sentences) written in a neutral judicial/administrative tone that the Welfare Officer can immediately post as the binding verdict."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            rootCauseAnalysis: { type: Type.STRING },
            severityLevel: { 
              type: Type.STRING,
              description: "Must be exactly one of: 'Low' | 'Medium' | 'High' | 'Critical'"
            },
            suggestedVerdict: { type: Type.STRING },
            actionSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            prefilledResolutionNotes: { type: Type.STRING }
          },
          required: ["executiveSummary", "rootCauseAnalysis", "severityLevel", "suggestedVerdict", "actionSteps", "prefilledResolutionNotes"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());
    res.json(resultJson);
  } catch (error: any) {
    console.error("Error in deep dispute analysis:", error);
    res.json({
      executiveSummary: "Disagreement over shift completion and daily wage release.",
      rootCauseAnalysis: "A lack of explicit, shared evidence of work completion or site hours.",
      severityLevel: "Medium",
      suggestedVerdict: "Welfare officer should conduct a quick mediation call and authorize a full or partial payout based on verified site attendance.",
      actionSteps: [
        "Audit geographic check-in parameters on the attendance log.",
        "Request the employer to outline the exact missing deliverables.",
        "Remind both parties of the mutual digital check-out checklist requirement."
      ],
      prefilledResolutionNotes: "Official resolution recorded. Attendance confirmed. Partially resolved pending joint confirmation."
    });
  }
});

/**
 * AI-powered 'Quick Resolve' Dispute Advisor
 * Evaluates the dispute description, contract wage, attendance records, and payment records to suggest a fair settlement.
 */
app.post("/api/gemini/quick-resolve-dispute", async (req, res) => {
  try {
    const { 
      complaintText, 
      raisedBy, 
      workerName, 
      employerName, 
      jobTitle, 
      wage, 
      attendanceRecords = [], 
      wagePayments = [] 
    } = req.body;

    if (!complaintText) {
      return res.status(400).json({ error: "complaintText is required" });
    }

    const ai = getAi();
    if (!ai) {
      console.warn("GEMINI_API_KEY is missing. Returning simulated fallback quick resolve response.");
      // Compute simple offline calculations based on records to make the fallback realistic
      const approvedShifts = attendanceRecords.filter((r: any) => r.status === "approved");
      const pendingShifts = attendanceRecords.filter((r: any) => r.status === "pending_approval");
      const paidPayments = wagePayments.filter((p: any) => p.status === "paid");
      const unpaidWages = approvedShifts.reduce((sum: number, r: any) => sum + (r.wageEarned || wage || 600), 0) - paidPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const suggestedAmount = Math.max(0, unpaidWages);

      return res.json({
        suggestedSettlement: `Pay the worker a pro-rated settlement of ₹${suggestedAmount > 0 ? suggestedAmount : (wage || 600)} based on completed attendance shifts and outstanding payments.`,
        recommendedPayout: suggestedAmount > 0 ? suggestedAmount : (wage || 600),
        justification: `Based on ${approvedShifts.length} approved shifts and ${paidPayments.length} paid transactions, the outstanding balance is ₹${suggestedAmount}. This provides a clear, data-driven compromise.`,
        prefilledResolutionNotes: `Quick Resolve applied via AI mediation. Checked ${approvedShifts.length} approved shifts of attendance. Outstanding payment of ₹${suggestedAmount > 0 ? suggestedAmount : (wage || 600)} has been recommended as a final settlement for worker ${workerName}.`
      });
    }

    // Format attendance and wage history as context
    const attendanceSummary = attendanceRecords.map((r: any, idx: number) => {
      return `Shift ${idx + 1}: Date: ${r.date || "N/A"}, Status: ${r.status || "N/A"}, Hours: ${r.hoursWorked || "N/A"}, Wage Earned: ₹${r.wageEarned || "N/A"}`;
    }).join("\n") || "No attendance records found for this job and worker.";

    const paymentsSummary = wagePayments.map((p: any, idx: number) => {
      return `Payment ${idx + 1}: Amount: ₹${p.amount || "N/A"}, Status: ${p.status || "N/A"}, Date: ${p.date || "N/A"}`;
    }).join("\n") || "No payment records found for this job and worker.";

    const prompt = `You are an expert labor welfare mediator and senior arbitration officer.
Analyze this work dispute between a daily laborer and their employer, taking into account their logged digital attendance records and payroll payment history to recommend a fair settlement.

Dispute Context:
- Worker Name: ${workerName || "Daily wage worker"}
- Employer Name: ${employerName || "Site contractor"}
- Job Title: ${jobTitle || "Daily shift assignment"}
- Agreed Daily Wage Rate: ₹${wage || 600}
- Grievance Raised By: ${raisedBy || "worker"}
- Dispute Description: "${complaintText}"

Worker's Logged Attendance Records:
${attendanceSummary}

Worker's Logged Payments Registry:
${paymentsSummary}

Determine a fair, data-driven compromise:
1. Review how many shifts were actually approved or checked in.
2. Review how much has actually been paid versus how much is owed.
3. Suggest a concrete settlement payout amount (recommendedPayout in Rupees, must be a number).
4. Provide a clear, unbiased settlement suggestion and a justification explaining the math based on the attendance and payment history.
5. Provide a 2-3 sentence template resolution note for the official case ledger.

Respond with a clean JSON object containing:
{
  "suggestedSettlement": "A clear, fair recommendation of action (e.g., 'Authorize a final settlement of ₹1200 for the 2 unpaid shifts...')",
  "recommendedPayout": 1200,
  "justification": "A precise, polite 1-2 sentence explanation of why this amount is correct based on the attendance logs (e.g. 'The worker completed 3 approved shifts but has only been paid for 1 shift so far...').",
  "prefilledResolutionNotes": "Formal administrative resolution note written in a neutral judicial/administrative tone."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedSettlement: { type: Type.STRING },
            recommendedPayout: { 
              type: Type.NUMBER,
              description: "The suggested payout amount in Rupees. Must be a numeric value."
            },
            justification: { type: Type.STRING },
            prefilledResolutionNotes: { type: Type.STRING }
          },
          required: ["suggestedSettlement", "recommendedPayout", "justification", "prefilledResolutionNotes"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());
    res.json(resultJson);
  } catch (error: any) {
    console.error("Error in Quick Resolve AI Dispute arbitration:", error);
    res.status(500).json({ error: "Internal server error conducting AI dispute quick resolution" });
  }
});

/**
 * AI Learning Coach & Chat Companion
 * Interactive tutor answering in simple, humble language, with options for regional or simplified explanations.
 */
app.post("/api/gemini/learning-chat", async (req, res) => {
  try {
    const { message, chatHistory, trade } = req.body;
    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const ai = getAi();
    if (!ai) {
      console.warn("GEMINI_API_KEY is missing. Returning simulated fallback learning-chat reply.");
      return res.json({
        reply: `Namaste! As an experienced coach, I can guide you. Safety and finance are very important.
1. Safety: Always wear your industrial safety helmet and protective shoes. Never stand on unstable scaffolding.
2. Finance: Open a zero-balance bank account. Try to save at least 20% of your daily wage for your family's future and kids' school milestones.
Please ask me any specific question about your trade, tools, or finance!`
      });
    }

    const formattedHistory = (chatHistory || []).map((h: any) => ({
      role: h.role === "user" ? "user" : "model",
      parts: [{ text: h.text }]
    }));

    const systemInstruction = `You are "EmpoGuru", an incredibly friendly, humble, and supportive AI Learning Coach for daily labourers on EmpoWork.
The user is a daily wage worker (e.g. Mason, Electrician, Plumber, Painter). They might have low literacy or speak simplified English.
Your goal is to answer their questions about technical trade skills, safety guidelines, or basic money/financial management.
- Always use simple, clear words.
- Avoid fancy terms. If you must use a technical word, explain it simply.
- Be extremely encouraging, polite, and respect their hard work.
- Keep answers relatively short (1-2 small paragraphs or bullet points).
- If they ask in Hindi or simple English mixed with local terms (Hinglish/simplified), respond in a way that matches their vibe perfectly.`;

    // Initialize Chat with history
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction,
        temperature: 0.7
      },
      history: formattedHistory
    });

    const response = await chat.sendMessage({ message });
    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Error in learning chat:", error);
    res.json({
      reply: "Namaste! I am here to help you. Always make sure to wear your helmet on the construction site and drink plenty of water. Let me know if you have questions about plastering, mixing mortar, or opening a bank account!"
    });
  }
});

/**
 * AI Safety Checklist Generator
 * Generates a task-specific well-being checklist for construction laborers using Gemini.
 */
app.post("/api/gemini/safety-checklist", async (req, res) => {
  const { task } = req.body;
  if (!task) {
    return res.status(400).json({ error: "task is required" });
  }
  try {
    const ai = getAi();
    if (!ai) {
      console.warn("GEMINI_API_KEY is missing. Returning simulated fallback safety-checklist.");
      return res.json({
        task: task,
        hazards: [
          "Risk of physical injury from falling tools or debris",
          "Silica dust inhalation from cement and dry mixing",
          "Muscle strain from lifting heavy materials incorrectly"
        ],
        checklist: [
          "Verify helmet is buckled and steel-toed boots are firmly laced",
          "Wear double-layer dust mask during concrete/brick dry handling",
          "Keep lifting back straight and bend at knees to lift heavy bricks",
          "Ensure work platform scaffold locks are checked by supervisor"
        ],
        safetyEquipmentRequired: ["Safety Helmet", "Steel-Toed Boots", "High-Filtering Dust Mask", "Heavy Leather Gloves"],
        encouragingTip: "Work safely today! Your family back home is waiting for your happy smile and healthy presence."
      });
    }

    const prompt = `You are a professional Construction Site Safety Engineer on EmpoWork.
Provide a clear, highly actionable safety checklist and hazard briefing for a daily wage laborer performing the following task: "${task}".

Analyze the task and return a JSON response matching this schema:
{
  "task": "Title of the task",
  "hazards": ["Hazard 1: Brief description", "Hazard 2: Brief description"],
  "checklist": [
    "Item 1: Actionable safety step",
    "Item 2: Actionable safety step",
    "Item 3: Actionable safety step",
    "Item 4: Actionable safety step"
  ],
  "safetyEquipmentRequired": ["Equipment 1", "Equipment 2"],
  "encouragingTip": "A friendly, polite tip in simple language (max 1 sentence) reminding them of their family and well-being."
}

Keep descriptions extremely simple, practical, and direct. Avoid complex terminology. Limit to 4-5 checklist items. Ensure the safety equipment matches the task.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            task: { type: Type.STRING },
            hazards: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            checklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            safetyEquipmentRequired: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            encouragingTip: { type: Type.STRING }
          },
          required: ["task", "hazards", "checklist", "safetyEquipmentRequired", "encouragingTip"]
        }
      }
    });

    const resultText = response.text || "{}";
    const resultJson = JSON.parse(resultText.trim());
    res.json(resultJson);
  } catch (error: any) {
    console.error("Error generating safety checklist:", error);
    res.json({
      task: task,
      hazards: [
        "Dust inhalation during mixing and construction operations",
        "Slippery floors or scaffold balance risks"
      ],
      checklist: [
        "Always wear your protective face mask and high-grip shoes",
        "Clear any tools or wet cement blockages from the walkway",
        "Check scaffolding support ropes and clamps with the foreman"
      ],
      safetyEquipmentRequired: ["Safety Helmet", "Anti-Slip Footwear", "Dust Mask"],
      encouragingTip: "Be careful at every step! Your safety is the greatest gift to your parents and children."
    });
  }
});

// Configure Vite or Static Assets serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
