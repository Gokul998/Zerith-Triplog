import { Router } from "express";
import { query, queryOne } from "../db/mysql";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [req.params.tripId]) as any;
  if (!trip) return res.status(404).json({ error: "Not found" });
  const isMember = await queryOne("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?", [req.params.tripId, userId]);
  if (trip.owner_id !== userId && !isMember) return res.status(403).json({ error: "Forbidden" });
  const limit = parseInt(req.query.limit as string || "50");
  const before = req.query.before as string;
  const msgs = before
    ? await query(`SELECT m.*, u.name as user_name, u.avatar_color FROM messages m JOIN users u ON m.user_id = u.id WHERE m.trip_id = ? AND m.created_at < ? ORDER BY m.created_at DESC LIMIT ?`, [req.params.tripId, before, limit])
    : await query(`SELECT m.*, u.name as user_name, u.avatar_color FROM messages m JOIN users u ON m.user_id = u.id WHERE m.trip_id = ? ORDER BY m.created_at DESC LIMIT ?`, [req.params.tripId, limit]);
  res.json((msgs as any[]).reverse());
});

export default router;
