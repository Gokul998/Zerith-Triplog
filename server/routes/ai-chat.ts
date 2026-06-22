import { Router } from "express";
import { queryOne, query } from "../db/mysql";
import { requireAuth } from "../auth";
import { callGemini } from "../gemini";

const router = Router({ mergeParams: true });

router.post("/", requireAuth, async (req, res, next) => {
  const { tripId } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message required" });

  try {
    const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [tripId]) as any;
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const activities = await query(
      "SELECT * FROM activities WHERE trip_id = ? ORDER BY day_id, sort_order LIMIT 10",
      [tripId]
    ) as any[];
    const activityList = activities.length > 0
      ? activities.map(a => `${a.title} at ${a.location || "TBD"} on ${a.day_id}`).join(", ")
      : "No activities planned yet";

    const prompt = `You are TripLog AI, a friendly travel assistant.
Trip: ${trip.title} to ${trip.destination} (${trip.start_date} to ${trip.end_date}).
Budget: ₹${trip.budget_amount || "flexible"}.
Planned activities: ${activityList}.
User question: ${message}
Give helpful, specific, concise travel advice in 2-3 sentences. Include practical tips like costs, timings, or local insights where relevant.`;

    const reply = await callGemini(prompt);
    res.json({ reply });
  } catch (err) {
    next(err);
  }
});

export default router;
