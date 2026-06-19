import { Router } from "express";
import db from "../db";
import { callGemini } from "../gemini";
import { verifyToken } from "../auth";

const router = Router({ mergeParams: true });

router.post("/", async (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !verifyToken(token)) return res.status(401).json({ error: "Unauthorized" });

  const { tripId } = req.params as { tripId: string };
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const activities = db.prepare(`
    SELECT a.title, a.description, a.location, a.category, a.start_time
    FROM activities a WHERE a.trip_id = ? ORDER BY a.sort_order
  `).all(tripId) as any[];

  const memories = db.prepare(`
    SELECT m.title, m.note, m.date, m.location, m.mood
    FROM memories m WHERE m.trip_id = ? ORDER BY m.date
  `).all(tripId) as any[];

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

  try {
    const summary = await callGemini(prompt);
    res.json({ summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "AI error" });
  }
});

export default router;
