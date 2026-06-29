import { Router } from "express";
import { queryOne } from "../db/mysql";
import { callGeminiJSON } from "../gemini";
import { requireAuth } from "../auth";
import { requirePro } from "../planGuard";

const router = Router({ mergeParams: true });

router.post("/suggest", requireAuth, requirePro, async (req, res, next) => {
  try {
    const { tripId } = req.params as { tripId: string };
    const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [tripId]) as any;
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

    const suggestions = await callGeminiJSON<{ category: string; items: string[] }[]>(prompt);
    res.json({ suggestions });
  } catch (e: any) {
    next(e);
  }
});

export default router;
