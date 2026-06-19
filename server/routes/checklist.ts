import { Router } from "express";
import { query, queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

const CATEGORIES = ["documents", "clothing", "electronics", "toiletries", "medicine", "money", "activities", "general"];

router.get("/", requireAuth, async (req, res) => {
  res.json(await query(`SELECT c.*, u.name as created_by_name, u2.name as checked_by_name FROM checklist_items c JOIN users u ON c.created_by = u.id LEFT JOIN users u2 ON c.checked_by = u2.id WHERE c.trip_id = ? ORDER BY c.category, c.created_at`, [req.params.tripId]));
});

router.post("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { text, category = "general" } = req.body;
  const id = crypto.randomUUID();
  await execute("INSERT INTO checklist_items (id, trip_id, text, category, created_by) VALUES (?, ?, ?, ?, ?)", [id, req.params.tripId, text, category, userId]);
  const item = await queryOne(`SELECT c.*, u.name as created_by_name FROM checklist_items c JOIN users u ON c.created_by = u.id WHERE c.id = ?`, [id]);
  res.json(item);
});

router.put("/:itemId", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { checked, text } = req.body;
  if (checked !== undefined) {
    await execute("UPDATE checklist_items SET checked = ?, checked_by = ? WHERE id = ? AND trip_id = ?", [checked ? 1 : 0, checked ? userId : null, req.params.itemId, req.params.tripId]);
  }
  if (text !== undefined) {
    await execute("UPDATE checklist_items SET text = ? WHERE id = ? AND trip_id = ?", [text, req.params.itemId, req.params.tripId]);
  }
  res.json(await queryOne(`SELECT c.*, u.name as created_by_name, u2.name as checked_by_name FROM checklist_items c JOIN users u ON c.created_by = u.id LEFT JOIN users u2 ON c.checked_by = u2.id WHERE c.id = ?`, [req.params.itemId]));
});

router.delete("/:itemId", requireAuth, async (req, res) => {
  await execute("DELETE FROM checklist_items WHERE id = ? AND trip_id = ?", [req.params.itemId, req.params.tripId]);
  res.json({ ok: true });
});

export default router;
