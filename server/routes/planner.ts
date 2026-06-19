import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import { callGeminiJSON } from "../gemini";

const router = Router({ mergeParams: true });

router.post("/generate", requireAuth, async (req, res) => {
  const { tripId } = req.params;
  try {
    const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const activities = db.prepare("SELECT * FROM activities WHERE trip_id = ? ORDER BY day_id, sort_order").all(tripId) as any[];
    const activityList = activities.length > 0
      ? activities.map(a => `- ${a.title} (${a.category}) at ${a.location || "TBD"}`).join("\n")
      : "No activities added yet";

    const prompt = `Create a day-by-day itinerary for a trip to ${trip.destination} from ${trip.start_date} to ${trip.end_date} with budget ₹${trip.budget_amount || "flexible"}.
Existing activities: ${activityList}
Return ONLY a JSON array, no markdown: [{"date":"YYYY-MM-DD","title":"Day theme","activities":[{"title":"string","category":"sightseeing|food|shopping|activity","location":"string","description":"string","estimatedTime":"X hours","cost":number}]}]
Make it realistic, well-paced, and consider local culture and travel times.`;

    const plan = await callGeminiJSON(prompt);
    res.json({ plan, destination: trip.destination });
  } catch (err) {
    console.error("Planner generate error:", err);
    res.status(500).json({ error: "Failed to generate plan" });
  }
});

export default router;
