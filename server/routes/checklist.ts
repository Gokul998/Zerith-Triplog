import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

const CATEGORIES = ["documents", "clothing", "electronics", "toiletries", "medicine", "money", "activities", "general"];

router.get("/", requireAuth, (req, res) => {
  res.json(db.prepare(`SELECT c.*, u.name as created_by_name, u2.name as checked_by_name FROM checklist_items c JOIN users u ON c.created_by = u.id LEFT JOIN users u2 ON c.checked_by = u2.id WHERE c.trip_id = ? ORDER BY c.category, c.created_at`).all(req.params.tripId));
});

router.post("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { text, category = "general" } = req.body;
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO checklist_items (id, trip_id, text, category, created_by) VALUES (?, ?, ?, ?, ?)").run(id, req.params.tripId, text, category, userId);
  const item = db.prepare(`SELECT c.*, u.name as created_by_name FROM checklist_items c JOIN users u ON c.created_by = u.id WHERE c.id = ?`).get(id);
  res.json(item);
});

router.put("/:itemId", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { checked, text } = req.body;
  if (checked !== undefined) {
    db.prepare("UPDATE checklist_items SET checked = ?, checked_by = ? WHERE id = ? AND trip_id = ?").run(checked ? 1 : 0, checked ? userId : null, req.params.itemId, req.params.tripId);
  }
  if (text !== undefined) {
    db.prepare("UPDATE checklist_items SET text = ? WHERE id = ? AND trip_id = ?").run(text, req.params.itemId, req.params.tripId);
  }
  res.json(db.prepare(`SELECT c.*, u.name as created_by_name, u2.name as checked_by_name FROM checklist_items c JOIN users u ON c.created_by = u.id LEFT JOIN users u2 ON c.checked_by = u2.id WHERE c.id = ?`).get(req.params.itemId));
});

router.delete("/:itemId", requireAuth, (req, res) => {
  db.prepare("DELETE FROM checklist_items WHERE id = ? AND trip_id = ?").run(req.params.itemId, req.params.tripId);
  res.json({ ok: true });
});

export default router;
