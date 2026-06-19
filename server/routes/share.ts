import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

// POST /api/trips/:tripId/share — generate or regenerate share token
router.post("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { tripId } = req.params;
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
  if (!trip) return res.status(404).json({ error: "Not found" });
  const isMember = db.prepare("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?").get(tripId, userId);
  if (trip.owner_id !== userId && !isMember) return res.status(403).json({ error: "Forbidden" });

  const token = crypto.randomUUID().replace(/-/g, "");
  db.prepare("UPDATE trips SET share_token = ? WHERE id = ?").run(token, tripId);

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/share/${token}`;
  res.json({ shareUrl, token });
});

// DELETE /api/trips/:tripId/share — remove share token
router.delete("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { tripId } = req.params;
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
  if (!trip || trip.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
  db.prepare("UPDATE trips SET share_token = NULL WHERE id = ?").run(tripId);
  res.json({ ok: true });
});

// GET /api/share/:token — public endpoint, no auth
export function publicShareRouter() {
  const pub = Router();
  pub.get("/:token", (req, res) => {
    const trip = db.prepare("SELECT t.id, t.title, t.destination, t.start_date, t.end_date, t.status, t.notes, u.name as owner_name FROM trips t JOIN users u ON t.owner_id = u.id WHERE t.share_token = ?").get(req.params.token) as any;
    if (!trip) return res.status(404).json({ error: "Share link not found or has been disabled" });

    const activities = db.prepare("SELECT * FROM activities WHERE trip_id = ? ORDER BY day_id ASC, sort_order ASC").all(trip.id) as any[];
    const memoriesCount = (db.prepare("SELECT COUNT(*) as c FROM memories WHERE trip_id = ?").get(trip.id) as any).c;

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
