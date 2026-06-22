import { Router } from "express";
import { queryOne, query } from "../db/mysql";
import { requireAuth } from "../auth";
import { callGemini } from "../gemini";

const router = Router({ mergeParams: true });

router.post("/", requireAuth, async (req, res, next) => {
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

    const prompt = `You are a travel writer. Write a beautiful, vivid, engaging trip story/summary paragraph (2-4 paragraphs) for this journey. Make it personal, evocative, and highlight the best moments. Do NOT use markdown, just flowing prose.

Trip: ${trip.title}
Destination: ${trip.destination}
Dates: ${trip.start_date} to ${trip.end_date}
Notes: ${trip.notes || "none"}

Activities planned:
${actText}

Memories captured:
${memText}

Write the trip story now:`;

    const summary = await callGemini(prompt);
    res.json({ summary });
  } catch (e: any) {
    next(e);
  }
});

export default router;
