import { Router } from "express";
import { callGeminiJSON } from "../gemini";

const router = Router();

// In-memory cache with 1 hour TTL
const cache = new Map<string, { data: any; expiresAt: number }>();

router.get("/", async (req, res) => {
  const { passport, destination } = req.query as { passport?: string; destination?: string };
  if (!passport || !destination) return res.status(400).json({ error: "passport and destination params required" });

  const cacheKey = `${passport.toUpperCase()}-${destination.toUpperCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  const prompt = `What are the visa requirements for a ${passport} passport holder traveling to ${destination}?
Return ONLY valid JSON with exactly these fields:
{
  "visaRequired": boolean,
  "visaOnArrival": boolean,
  "eVisa": boolean,
  "duration": "e.g. 30 days or 90 days",
  "requirements": ["list", "of", "key", "requirements"],
  "notes": "brief additional notes"
}
Be concise and accurate. Base on current 2024-2025 regulations.`;

  try {
    const data = await callGeminiJSON<{
      visaRequired: boolean;
      visaOnArrival: boolean;
      eVisa: boolean;
      duration: string;
      requirements: string[];
      notes: string;
    }>(prompt);

    cache.set(cacheKey, { data, expiresAt: Date.now() + 60 * 60 * 1000 });
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed to fetch visa info" });
  }
});

export default router;
