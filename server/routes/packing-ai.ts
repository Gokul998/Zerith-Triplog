import { Router } from "express";
import db from "../db";
import { callGeminiJSON } from "../gemini";
import { verifyToken } from "../auth";

const router = Router({ mergeParams: true });

router.post("/suggest", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) return res.status(401).json({ error: "Unauthorized" });

  const { tripId } = req.params as { tripId: string };
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const prompt = `You are a travel packing expert. Generate a comprehensive packing list for this trip:
Destination: ${trip.destination}
Start date: ${trip.start_date}
End date: ${trip.end_date}
Notes: ${trip.notes || "none"}

Return a JSON array of categories with items. Use these categories where relevant: documents, clothing, electronics, toiletries, medicine, money, activities, general.

Return ONLY valid JSON in this exact format, no markdown:
[
  { "category": "documents", "items": ["Passport", "Travel insurance"] },
  { "category": "clothing", "items": ["T-shirts", "Underwear"] }
]`;

  try {
    const suggestions = await callGeminiJSON<{ category: string; items: string[] }[]>(prompt);
    res.json({ suggestions });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "AI error" });
  }
});

export default router;
