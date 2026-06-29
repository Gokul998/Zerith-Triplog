import { Router } from "express";
import { queryOne, query } from "../db/mysql";
import { requireAuth } from "../auth";
import { requirePro } from "../planGuard";
import { callGemini } from "../gemini";

const router = Router({ mergeParams: true });

router.post("/", requireAuth, requirePro, async (req, res, next) => {
  const { tripId } = req.params;
  try {
    const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [tripId]) as any;
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const activities = await query(
      "SELECT title, description, location, category, start_time FROM activities WHERE trip_id = ? ORDER BY sort_order",
      [tripId]
    ) as any[];

    const memories = await query(
      "SELECT title, note, date, location, mood FROM memories WHERE trip_id = ? ORDER BY date",
      [tripId]
    ) as any[];

    const actText = activities.length
      ? activities.map(a => `- ${a.title}${a.location ? ` at ${a.location}` : ""}${a.description ? `: ${a.description}` : ""}`).join("\n")
      : "No activities recorded.";

    const memText = memories.length
      ? memories.map(m => `- ${m.date}: ${m.title}${m.note ? ` — ${m.note}` : ""}${m.mood ? ` (mood: ${m.mood})` : ""}`).join("\n")
      : "No memories recorded.";

    const prompt = `You are a travel writer and cultural historian. Generate a rich travel document with TWO clearly separated sections.

Trip: ${trip.title}
Destination: ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date}
Notes: ${trip.notes || "none"}

Activities planned:
${actText}

Memories captured:
${memText}

---

Section 1 — TRIP STORY
Write 2-4 paragraphs of beautiful, vivid, personal travel narrative about this journey. Make it evocative and highlight the best moments. Plain prose, no bullet points.

Section 2 — DESTINATION GUIDE: ${trip.destination}
Write detailed information covering ALL of the following, each as a short paragraph:
- Ancient History & Origins: founding, early civilisations, key historical events
- Cultural Heritage: traditions, festivals, art forms, architecture, UNESCO sites or notable monuments
- People & Society: ethnic groups, languages, local customs, hospitality culture, way of life
- Religion & Spirituality: dominant faiths, sacred sites, rituals
- Food & Cuisine: signature dishes, street food, culinary traditions
- Best Time & Travel Tips: seasons, what to wear, local etiquette, hidden gems

Separate the two sections with the exact line: ---DESTINATION GUIDE---
Do not use markdown headers or bullet points, only flowing paragraphs with bold labels like "Ancient History:" at the start of each paragraph.`;

    const summary = await callGemini(prompt);
    res.json({ summary });
  } catch (e: any) {
    next(e);
  }
});

export default router;
