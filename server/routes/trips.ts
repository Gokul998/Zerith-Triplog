import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router();

function getTripsForUser(userId: string) {
  return db.prepare(`
    SELECT t.*, u.name as owner_name,
      (SELECT COUNT(*) FROM trip_members WHERE trip_id = t.id) as member_count,
      CASE WHEN t.owner_id = ? THEN 1 ELSE 0 END as is_owner
    FROM trips t
    JOIN users u ON t.owner_id = u.id
    LEFT JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = ?
    WHERE t.owner_id = ? OR tm.user_id = ?
    ORDER BY t.created_at DESC
  `).all(userId, userId, userId, userId);
}

router.get("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  res.json(getTripsForUser(userId));
});

router.post("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { title, destination, start_date, end_date, status = "planning", notes = "", currency = "USD", budget_amount } = req.body;
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO trips (id, title, destination, start_date, end_date, status, notes, currency, budget_amount, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, title, destination, start_date, end_date, status, notes, currency, budget_amount ?? null, userId);
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(id);
  res.json(trip);
});

router.get("/:id", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const trip = db.prepare(`SELECT t.*, u.name as owner_name FROM trips t JOIN users u ON t.owner_id = u.id WHERE t.id = ?`).get(req.params.id) as any;
  if (!trip) return res.status(404).json({ error: "Not found" });
  const isMember = db.prepare("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?").get(req.params.id, userId);
  if (trip.owner_id !== userId && !isMember) return res.status(403).json({ error: "Forbidden" });
  const members = db.prepare(`SELECT u.id, u.name, u.email, u.avatar_color, tm.role FROM trip_members tm JOIN users u ON tm.user_id = u.id WHERE tm.trip_id = ?`).all(req.params.id);
  const owner = db.prepare("SELECT id, name, email, avatar_color FROM users WHERE id = ?").get(trip.owner_id);
  res.json({ ...trip, members, owner });
});

router.put("/:id", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.id) as any;
  if (!trip || trip.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
  const { title, destination, start_date, end_date, status, notes, currency, budget_amount } = req.body;
  db.prepare(`UPDATE trips SET title=?, destination=?, start_date=?, end_date=?, status=?, notes=?, currency=?, budget_amount=?, updated_at=datetime('now') WHERE id=?`).run(title ?? trip.title, destination ?? trip.destination, start_date ?? trip.start_date, end_date ?? trip.end_date, status ?? trip.status, notes ?? trip.notes, currency ?? trip.currency, budget_amount ?? trip.budget_amount, req.params.id);
  res.json(db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.id));
});

router.delete("/:id", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.id) as any;
  if (!trip || trip.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
  db.prepare("DELETE FROM trips WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

export default router;
