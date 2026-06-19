import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import { callGemini } from "../gemini";

const router = Router({ mergeParams: true });

router.post("/insights", requireAuth, async (req, res) => {
  const { tripId } = req.params;
  try {
    const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    const expenses = db.prepare("SELECT * FROM expenses WHERE trip_id = ?").all(tripId) as any[];
    const totalSpent = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    const byCategory: Record<string, number> = {};
    for (const e of expenses) byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    const categoryBreakdown = Object.entries(byCategory).map(([cat, amt]) => `${cat}: ₹${amt}`).join(", ");

    const prompt = `Analyze this trip budget and give actionable advice:
Trip: ${trip.title} to ${trip.destination}
Total Budget: ₹${trip.budget_amount || "Not set"}
Total Spent: ₹${totalSpent}
By category: ${categoryBreakdown || "No expenses yet"}
Dates: ${trip.start_date} to ${trip.end_date}

Give 3-4 specific insights covering:
1. Budget utilization (on track / overspending / underspending)
2. Which category is highest and if it's reasonable for ${trip.destination}
3. Money-saving tips specific to ${trip.destination}
4. Forecast: estimated total spend based on current pace
Write in plain text, no bullet points or markdown, conversational tone.`;

    const insights = await callGemini(prompt);
    res.json({ insights });
  } catch (err) {
    console.error("Budget insights error:", err);
    res.status(500).json({ error: "Failed to get insights" });
  }
});

export default router;
