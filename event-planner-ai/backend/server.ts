import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import dotenv from "dotenv";
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { Agent, setGlobalDispatcher } from "undici";

dotenv.config();

// Set global dispatcher for undici (Node native fetch engine) to prevent HeadersTimeoutError
// during long-running Gemini generation requests.
setGlobalDispatcher(
  new Agent({
    headersTimeout: 180000, // 3 minutes
    bodyTimeout: 180000,    // 3 minutes
    connectTimeout: 60000,  // 1 minute
  })
);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(process.cwd(), "db.json");

// Helper to interact with the JSON database
async function readDb() {
  try {
    const data = await fs.readFile(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    const defaultDb = { users: [], events: [] };
    await fs.writeFile(DB_FILE, JSON.stringify(defaultDb, null, 2), "utf-8");
    return defaultDb;
  }
}

async function writeDb(data: any) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// Password hashing utility
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Lazy initialization check for Gemini API Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Gemini API Key. Please click the Settings gear icon (bottom-left) in Google AI Studio, open 'Secrets', and add a secret named GEMINI_API_KEY with your key.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        timeout: 180000, // 3 minutes
        headers: {
          "User-Agent": "aistudio-build",
          "Connection": "close",
        },
      },
    });
  }
  return geminiClient;
}

// Simple authentication middleware
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. Please log in." });
  }
  const token = authHeader.split(" ")[1];
  const parts = token.split("_");
  if (parts.length < 2) {
    return res.status(401).json({ error: "Invalid token. Please log in again." });
  }
  req.user = {
    id: parts[0],
    username: parts[1],
  };
  next();
}

// ================= API ENDPOINTS =================

// Register a new user
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const db = await readDb();
    const existing = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "Username is already taken." });
    }

    const newUser = {
      id: crypto.randomUUID(),
      username,
      passwordHash: hashPassword(password),
    };

    db.users.push(newUser);
    await writeDb(db);

    const token = `${newUser.id}_${newUser.username}_${crypto.randomBytes(8).toString("hex")}`;
    res.json({
      success: true,
      message: "Registration successful!",
      user: { id: newUser.id, username: newUser.username },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Registration failed" });
  }
});

// Login user
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const db = await readDb();
    const user = db.users.find((u: any) => u.username.toLowerCase() === username.toLowerCase());
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid username or password." });
    }

    const token = `${user.id}_${user.username}_${crypto.randomBytes(8).toString("hex")}`;
    res.json({
      success: true,
      message: "Login successful!",
      user: { id: user.id, username: user.username },
      token,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Login failed" });
  }
});

// Get all events for the authenticated user
app.get("/api/events", authenticate, async (req: any, res) => {
  try {
    const db = await readDb();
    const userEvents = db.events.filter((e: any) => e.userId === req.user.id);
    res.json(userEvents);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to load events" });
  }
});

// Create a new event configuration
app.post("/api/events", authenticate, async (req: any, res) => {
  try {
    const { title, type, budget, guestCount, date, currency } = req.body;
    if (!title || !type || !budget || !guestCount || !date) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const db = await readDb();
    const newEvent = {
      id: crypto.randomUUID(),
      userId: req.user.id,
      title,
      type,
      budget: Number(budget),
      guestCount: Number(guestCount),
      date,
      createdAt: new Date().toISOString(),
      plan: null,
      currency: currency || "USD",
    };

    db.events.push(newEvent);
    await writeDb(db);

    res.json(newEvent);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to create event" });
  }
});

// Update an existing event configuration (e.g. currency, budget, guest count)
app.put("/api/events/:id", authenticate, async (req: any, res) => {
  try {
    const { title, type, budget, guestCount, date, currency } = req.body;
    const db = await readDb();
    const event = db.events.find((e: any) => e.id === req.params.id && e.userId === req.user.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (title !== undefined) event.title = title;
    if (type !== undefined) event.type = type;
    if (budget !== undefined) event.budget = Number(budget);
    if (guestCount !== undefined) event.guestCount = Number(guestCount);
    if (date !== undefined) event.date = date;
    if (currency !== undefined) event.currency = currency;

    await writeDb(db);
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update event" });
  }
});

// Delete an event
app.delete("/api/events/:id", authenticate, async (req: any, res) => {
  try {
    const db = await readDb();
    const index = db.events.findIndex((e: any) => e.id === req.params.id && e.userId === req.user.id);
    if (index === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    db.events.splice(index, 1);
    await writeDb(db);

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to delete event" });
  }
});

// Toggle a schedule item's completion status
app.post("/api/events/:id/toggle-schedule", authenticate, async (req: any, res) => {
  try {
    const { itemId } = req.body;
    const db = await readDb();
    const event = db.events.find((e: any) => e.id === req.params.id && e.userId === req.user.id);
    if (!event || !event.plan) {
      return res.status(404).json({ error: "Event or generated plan not found" });
    }

    const item = event.plan.schedule.find((s: any) => s.id === itemId);
    if (item) {
      item.completed = !item.completed;
    }

    await writeDb(db);
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update schedule item" });
  }
});

// Toggle a checklist item's completion status
app.post("/api/events/:id/toggle-checklist", authenticate, async (req: any, res) => {
  try {
    const { itemId } = req.body;
    const db = await readDb();
    const event = db.events.find((e: any) => e.id === req.params.id && e.userId === req.user.id);
    if (!event || !event.plan) {
      return res.status(404).json({ error: "Event or generated plan not found" });
    }

    const item = event.plan.checklist.find((c: any) => c.id === itemId);
    if (item) {
      item.completed = !item.completed;
    }

    await writeDb(db);
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to update checklist item" });
  }
});

// Add a custom checklist item to an event plan
app.post("/api/events/:id/add-checklist-item", authenticate, async (req: any, res) => {
  try {
    const { task, category } = req.body;
    if (!task || !category) {
      return res.status(400).json({ error: "Task and category are required." });
    }

    const db = await readDb();
    const event = db.events.find((e: any) => e.id === req.params.id && e.userId === req.user.id);
    if (!event || !event.plan) {
      return res.status(404).json({ error: "Event or generated plan not found" });
    }

    const newItem = {
      id: crypto.randomUUID(),
      task,
      category,
      completed: false,
    };

    event.plan.checklist.push(newItem);
    await writeDb(db);

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to add checklist item" });
  }
});

// Robust wrapper for Gemini API calls to handle transient errors, high-demand limits (503),
// and rate limits (429) using exponential backoff with jitter and fallback models.
async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: {
    model: string;
    contents: any;
    config?: any;
  }
): Promise<any> {
  const modelsToTry = [options.model, "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
  const uniqueModels = Array.from(new Set(modelsToTry));
  let lastError: any = null;

  for (let i = 0; i < uniqueModels.length; i++) {
    const currentModel = uniqueModels[i];
    let delay = 500; // Start with brief 500ms delay for faster transitions
    const maxRetries = 1; // Limit to 1 retry per model for low latency, switching to another model quickly if blocked

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Generating content using model "${currentModel}" (Attempt ${attempt + 1}/${maxRetries + 1})...`);
        const startTime = Date.now();

        // Create a deep clone/merge of the request config to avoid mutating original
        const requestConfig = { ...(options.config || {}) };

        // For Gemini 3 models, bypass the slow thinking/reasoning phase entirely
        // by setting thinkingLevel to MINIMAL. This drops latency significantly.
        if (currentModel.startsWith("gemini-3")) {
          requestConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
        } else {
          // Prevent API validation errors by deleting thinkingConfig on non-Gemini 3 models
          delete requestConfig.thinkingConfig;
        }

        const response = await ai.models.generateContent({
          contents: options.contents,
          model: currentModel,
          config: requestConfig,
        });

        const latency = Date.now() - startTime;
        console.log(`[Gemini API] Successfully generated content using model "${currentModel}" in ${latency}ms`);
        return response;
      } catch (error: any) {
        lastError = error;
        console.error(`[Gemini API] Attempt ${attempt + 1} with model "${currentModel}" failed:`, error);

        const errorMsg = error?.message || "";
        const is503 = error?.status === 503 || error?.code === 503 || errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("high demand");
        const is429 = error?.status === 429 || error?.code === 429 || errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("rate limit");
        const isNetwork = errorMsg.includes("fetch failed") || errorMsg.includes("Timeout") || errorMsg.includes("DEADLINE_EXCEEDED") || errorMsg.includes("504");

        const shouldRetry = is503 || is429 || isNetwork;

        // If this model is experiencing high demand (503) or rate limits (429), and we have alternative models
        // left in our queue, bypass the retry backoffs and switch to the next model immediately to minimize user latency.
        const isLastModel = i === uniqueModels.length - 1;
        const canRetryThisModel = shouldRetry && attempt < maxRetries && (isLastModel || (!is503 && !is429));

        if (canRetryThisModel) {
          const backoff = delay * (1.1 + Math.random() * 0.3);
          console.log(`[Gemini API] Transient error detected. Retrying model "${currentModel}" in ${Math.round(backoff)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          delay *= 1.5;
        } else {
          console.log(`[Gemini API] Skipping further retries for model "${currentModel}". Advancing to the next available fallback model...`);
          break; // Move to the next model
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all available models");
}

// Generate Event Plan with AI
app.post("/api/events/:id/generate", authenticate, async (req: any, res) => {
  try {
    const db = await readDb();
    const event = db.events.find((e: any) => e.id === req.params.id && e.userId === req.user.id);
    if (!event) {
      return res.status(404).json({ error: "Event config not found" });
    }

    // Try to get Gemini client - might throw if GEMINI_API_KEY is missing or invalid
    let ai;
    try {
      ai = getGeminiClient();
    } catch (apiError: any) {
      return res.status(400).json({
        error: apiError.message
      });
    }

    const currencySymbol = event.currency === "INR" ? "₹" : "$";
    const currencyCode = event.currency || "USD";

    const prompt = `You are an elite, highly experienced professional event coordinator. Generate an exquisite, beautifully focused, and cohesive event blueprint for:
Event Title: "${event.title}"
Event Type: "${event.type}"
Guest Count: ${event.guestCount} attendees
Total Budget: ${currencySymbol}${event.budget.toLocaleString(event.currency === "INR" ? "en-IN" : "en-US")} (${currencyCode})

Please follow these guidelines strictly for highly fast, elegant results:
1. "schedule": Provide 4 to 6 highly structured, milestone-focused schedule blocks for the day of the event or leading up to it. Be precise. Specify actual hours like '10:00 AM' or '06:30 PM'.
2. "checklist": Provide 5 to 7 highly realistic event management preparation tasks spanning categories like "Preparation", "Decoration", "Vendors", or "Logistics".
3. "vendors": Suggest 3 to 4 fitting, creative vendor categories (e.g. Venue, Catering, Photography, Entertainment/Music). Ensure estimated costs are balanced and sum up to respect the absolute ${currencySymbol}${event.budget.toLocaleString(event.currency === "INR" ? "en-IN" : "en-US")} budget. Add 2 practical questions to ask each vendor. Please specify estimated costs using the currency symbol ${currencySymbol} (e.g. ${event.currency === "INR" ? "₹1,50,000" : "$1,500"}).

Response must strictly adhere to the response schema.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique short random string id (e.g., 'sch1')" },
                  time: { type: Type.STRING, description: "Chronological time or period, e.g. '04:30 PM'" },
                  title: { type: Type.STRING, description: "Milestone activity name" },
                  description: { type: Type.STRING, description: "Detailed summary of what occurs and coordination notes" },
                },
                required: ["id", "time", "title", "description"]
              },
              description: "Day-of timeline milestones"
            },
            checklist: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: "A unique short random string id (e.g., 'chk1')" },
                  task: { type: Type.STRING, description: "Checklist item action text" },
                  category: { type: Type.STRING, description: "Thematic group of the task" },
                },
                required: ["id", "task", "category"]
              },
              description: "To-do checklist steps"
            },
            vendors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING, description: "Vendor category, e.g., 'Catering', 'Decor'" },
                  name: { type: Type.STRING, description: "A stylish, representative vendor company name" },
                  estimatedCost: { type: Type.STRING, description: `Approximate cost segment allocated out of total budget, formatted in the correct currency, e.g., '${event.currency === "INR" ? "₹1,50,000" : "$1,500"}'` },
                  description: { type: Type.STRING, description: "Services overview and compatibility logic" },
                  rating: { type: Type.STRING, description: "Simulated review rating (e.g. '4.8/5')" },
                  tips: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Key questions or coordination tips for this vendor"
                  }
                },
                required: ["category", "name", "estimatedCost", "description", "rating", "tips"]
              },
              description: "Realistic budget-matched vendor recommendations"
            }
          },
          required: ["schedule", "checklist", "vendors"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response received from Gemini API");
    }

    const generatedData = JSON.parse(text.trim());

    // Populate initial state with completed: false for schedule and checklist items
    const plan = {
      schedule: (generatedData.schedule || []).map((s: any, idx: number) => ({
        id: s.id || `sch-${idx}`,
        time: s.time || "TBD",
        title: s.title || "Activity",
        description: s.description || "",
        completed: false,
      })),
      checklist: (generatedData.checklist || []).map((c: any, idx: number) => ({
        id: c.id || `chk-${idx}`,
        task: c.task || "Task",
        category: c.category || "General",
        completed: false,
      })),
      vendors: (generatedData.vendors || []).map((v: any) => ({
        category: v.category || "Other",
        name: v.name || "Vendor Partner",
        estimatedCost: v.estimatedCost || "TBD",
        description: v.description || "",
        rating: v.rating || "4.5/5",
        tips: Array.isArray(v.tips) ? v.tips : ["Consult with them about custom packages"],
      })),
    };

    event.plan = plan;
    await writeDb(db);

    res.json(event);
 } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    let userMessage = error.message || "Failed to generate plan using Gemini AI";
    
    // Detect common API Key / Authentication errors
    const errorString = String(error.message || "").toLowerCase();
    const isAuthError = 
      error.status === 401 || 
      error.code === 401 || 
      errorString.includes("unauthenticated") || 
      errorString.includes("auth") || 
      errorString.includes("api_key_service_blocked") || 
      errorString.includes("access_token_type_unsupported") ||
      errorString.includes("blocked");
      
    const apiKey = process.env.GEMINI_API_KEY || "";
    
    if (isAuthError) {
      if (apiKey.startsWith("AQ.A")) {
        userMessage = "The system's default environment token does not have developer API access enabled in this sandbox. Please click the Settings gear icon (bottom-left) in Google AI Studio, open 'Secrets', and save your own valid Gemini API Key from https://aistudio.google.com/apikey as 'GEMINI_API_KEY' to enable instant plan generation.";
      } else {
        userMessage = "Gemini API Key Authentication failed. Please verify that your key under Google AI Studio Settings > Secrets is valid and named exactly 'GEMINI_API_KEY', or create a new one at https://aistudio.google.com/apikey.";
      }
    }
    
    res.status(500).json({ error: userMessage });
  }
});

// ================= SERVER START =================
// This backend is a standalone JSON API only. The frontend (in ../frontend)
// runs and is deployed completely separately, and talks to this server over
// HTTP (see the frontend's vite.config.ts dev proxy / VITE_API_URL for how
// it finds this server).

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Event Planner AI API listening at http://localhost:${PORT}`);
});
