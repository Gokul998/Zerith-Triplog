import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../auth";

const router = Router({ mergeParams: true });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/scan", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Gemini API key not configured" });

  const base64Image = req.file.buffer.toString("base64");
  const mimeType = req.file.mimetype || "image/jpeg";

  const prompt = `Extract expense info from this receipt image. Return ONLY valid JSON with these fields: { "title": "short description", "amount": number, "currency": "3-letter code like USD", "category": "one of: accommodation, transport, food, activities, shopping, health, communication, other", "date": "YYYY-MM-DD or null", "merchant": "store/restaurant name" }. If you cannot determine a value, use null for strings and 0 for amount.`;

  const MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let lastErr: any;

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: base64Image } }
            ]
          }]
        }),
      });

      const data = await response.json();
      if (data.error) {
        const msg = data.error.message || "";
        if (data.error.code === 503 || msg.includes("overloaded") || msg.includes("not found")) {
          lastErr = new Error(msg); continue;
        }
        throw new Error(msg);
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) { lastErr = new Error("Empty response"); continue; }

      // Strip markdown and parse JSON
      let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { lastErr = new Error("No JSON in response"); continue; }

      const result = JSON.parse(jsonMatch[0]);
      return res.json({
        title: result.title || "Receipt",
        amount: typeof result.amount === "number" ? result.amount : parseFloat(result.amount) || 0,
        currency: result.currency || "USD",
        category: result.category || "other",
        date: result.date || new Date().toISOString().slice(0, 10),
        merchant: result.merchant || "",
      });
    } catch (e: any) {
      lastErr = e;
      if (!e.message?.includes("overloaded") && !e.message?.includes("not found")) {
        return res.status(500).json({ error: e.message });
      }
    }
  }

  res.status(500).json({ error: lastErr?.message || "Failed to scan receipt" });
});

export default router;
