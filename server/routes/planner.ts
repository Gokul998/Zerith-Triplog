import { Router } from "express";
import { queryOne, query } from "../db/mysql";
import { requireAuth } from "../auth";
import { callGeminiJSON } from "../gemini";

const router = Router({ mergeParams: true });

router.post("/generate", requireAuth, async (req, res, next) => {
  const { tripId } = req.params;
  try {
    const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [tripId]) as any;
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const activities = await query(
      "SELECT * FROM activities WHERE trip_id = ? ORDER BY day_id, sort_order",
      [tripId]
    ) as any[];
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
    next(err);
  }
});

export default router;
