import { Router } from "express";
import { query, queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

// POST /api/trips/:tripId/share — generate or regenerate share token
router.post("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { tripId } = req.params;
  const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [tripId]) as any;
  if (!trip) return res.status(404).json({ error: "Not found" });
  const isMember = await queryOne("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?", [tripId, userId]);
  if (trip.owner_id !== userId && !isMember) return res.status(403).json({ error: "Forbidden" });

  const token = crypto.randomUUID().replace(/-/g, "");
  await execute("UPDATE trips SET share_token = ? WHERE id = ?", [token, tripId]);

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${token}`;
  res.json({ shareUrl, token });
});

// DELETE /api/trips/:tripId/share — remove share token
router.delete("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { tripId } = req.params;
  const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [tripId]) as any;
  if (!trip || trip.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
  await execute("UPDATE trips SET share_token = NULL WHERE id = ?", [tripId]);
  res.json({ ok: true });
});

// GET /api/share/:token — public endpoint, no auth
export function publicShareRouter() {
  const pub = Router();
  pub.get("/:token", async (req, res) => {
    const trip = await queryOne("SELECT t.id, t.title, t.destination, t.start_date, t.end_date, t.status, t.notes, u.name as owner_name FROM trips t JOIN users u ON t.owner_id = u.id WHERE t.share_token = ?", [req.params.token]) as any;
    if (!trip) return res.status(404).json({ error: "Share link not found or has been disabled" });

    const activities = await query("SELECT * FROM activities WHERE trip_id = ? ORDER BY day_id ASC, sort_order ASC", [trip.id]) as any[];
    const memoriesCountRow = await queryOne("SELECT COUNT(*) as c FROM memories WHERE trip_id = ?", [trip.id]) as any;
    const memoriesCount = memoriesCountRow.c;

    // Group activities by day
    const dayMap: Record<string, any[]> = {};
    for (const a of activities) {
      if (!dayMap[a.day_id]) dayMap[a.day_id] = [];
      dayMap[a.day_id].push({ ...a, vote_up: JSON.parse(a.vote_up || "[]"), vote_down: JSON.parse(a.vote_down || "[]") });
    }
    const days = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, acts]) => ({ date, activities: acts }));

    res.json({ trip, days, memoriesCount });
  });
  return pub;
}

export default router;
