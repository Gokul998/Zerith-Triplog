import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth";

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PROMPT = `Extract expense info from this receipt image. Return ONLY valid JSON with these fields: { "title": "short description", "amount": number, "currency": "3-letter code like USD", "category": "one of: accommodation, transport, food, activities, shopping, health, communication, other", "date": "YYYY-MM-DD or null", "merchant": "store/restaurant name" }. If you cannot determine a value, use null for strings and 0 for amount.`;

function parseReceiptJson(text: string) {
  const cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
  // Extract the first complete JSON object by finding balanced braces
  const start = cleaned.indexOf("{");
  if (start === -1) throw new Error("No JSON in response");
  let depth = 0;
  let end = -1;
  for (let i = start; i < cleaned.length; i++) {
    if (cleaned[i] === "{") depth++;
    else if (cleaned[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error("Malformed JSON in response");
  const r = JSON.parse(cleaned.slice(start, end + 1));
  return {
    title: r.title || "Receipt",
    amount: typeof r.amount === "number" ? r.amount : parseFloat(r.amount) || 0,
    currency: r.currency || "USD",
    category: r.category || "other",
    date: r.date || new Date().toISOString().slice(0, 10),
    merchant: r.merchant || "",
  };
}

async function scanWithGroq(base64Image: string, mimeType: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY not set");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } },
        ],
      }],
      max_tokens: 512,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Groq error");
  return data.choices?.[0]?.message?.content || "";
}

async function scanWithGemini(base64Image: string, mimeType: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let lastErr: any;
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: base64Image } }] }] }),
      });
      const data = await res.json();
      if (data.error) { lastErr = new Error(data.error.message); continue; }
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return text;
    } catch (e: any) { lastErr = e; }
  }
  throw lastErr || new Error("Gemini scan failed");
}

router.post("/scan", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });
  const base64Image = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype || "image/jpeg";

  try {
    let text: string;
    if (process.env.GROQ_API_KEY) {
      try {
        text = await scanWithGroq(base64Image, mimeType);
      } catch (e: any) {
        console.warn("Groq vision failed, falling back to Gemini:", e.message);
        text = await scanWithGemini(base64Image, mimeType);
      }
    } else {
      text = await scanWithGemini(base64Image, mimeType);
    }
    return res.json(parseReceiptJson(text));
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to scan receipt" });
  }
});

export default router;
