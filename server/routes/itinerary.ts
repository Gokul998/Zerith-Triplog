import { Router } from "express";
import { query, queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

// GET all activities for a trip grouped by date
router.get("/", requireAuth, async (req, res) => {
  const activities = await query(`
    SELECT * FROM activities WHERE trip_id = ? ORDER BY day_id ASC, sort_order ASC
  `, [req.params.tripId]);
  res.json((activities as any[]).map((a: any) => ({
    ...a,
    vote_up: JSON.parse(a.vote_up || "[]"),
    vote_down: JSON.parse(a.vote_down || "[]"),
  })));
});

// POST create activity
router.post("/activities", requireAuth, async (req, res) => {
  const { date, title, description = "", location = "", category = "sightseeing", start_time = null, end_time = null, cost = 0, currency = "USD", status = "planned" } = req.body;
  if (!date || !title) return res.status(400).json({ error: "date and title required" });
  const id = crypto.randomUUID();
  const maxOrderRow = await queryOne("SELECT MAX(sort_order) as m FROM activities WHERE trip_id = ? AND day_id = ?", [req.params.tripId, date]) as any;
  const maxOrder = maxOrderRow?.m ?? -1;
  await execute(`INSERT INTO activities (id, trip_id, day_id, title, description, location, category, start_time, end_time, cost, currency, status, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, req.params.tripId, date, title, description, location, category, start_time, end_time, cost, currency, status, maxOrder + 1]);
  const activity = await queryOne("SELECT * FROM activities WHERE id = ?", [id]) as any;
  res.json({ ...activity, vote_up: [], vote_down: [] });
});

// PUT update activity
router.put("/activities/:activityId", requireAuth, async (req, res) => {
  const existing = await queryOne("SELECT * FROM activities WHERE id = ? AND trip_id = ?", [req.params.activityId, req.params.tripId]) as any;
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { title, description, location, category, start_time, end_time, cost, currency, status, sort_order } = req.body;
  await execute(`UPDATE activities SET title=COALESCE(?,title), description=COALESCE(?,description), location=COALESCE(?,location),
    category=COALESCE(?,category), start_time=?, end_time=?, cost=COALESCE(?,cost),
    currency=COALESCE(?,currency), status=COALESCE(?,status), sort_order=COALESCE(?,sort_order) WHERE id=?`,
    [title, description, location, category, start_time ?? existing.start_time, end_time ?? existing.end_time, cost, currency, status, sort_order, req.params.activityId]);
  const activity = await queryOne("SELECT * FROM activities WHERE id = ?", [req.params.activityId]) as any;
  res.json({ ...activity, vote_up: JSON.parse(activity.vote_up || "[]"), vote_down: JSON.parse(activity.vote_down || "[]") });
});

// DELETE activity
router.delete("/activities/:activityId", requireAuth, async (req, res) => {
  await execute("DELETE FROM activities WHERE id = ? AND trip_id = ?", [req.params.activityId, req.params.tripId]);
  res.json({ ok: true });
});

export default router;
