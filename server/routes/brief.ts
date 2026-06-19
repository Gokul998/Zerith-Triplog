import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { tripId } = req.params;

  const trip = db.prepare(`SELECT t.*, u.name as owner_name FROM trips t JOIN users u ON t.owner_id = u.id WHERE t.id = ?`).get(tripId) as any;
  if (!trip) return res.status(404).json({ error: "Not found" });

  const isMember = db.prepare("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?").get(tripId, userId);
  if (trip.owner_id !== userId && !isMember) return res.status(403).json({ error: "Forbidden" });

  // Activities grouped by day
  const activities = db.prepare(`SELECT * FROM activities WHERE trip_id = ? ORDER BY day_id ASC, sort_order ASC`).all(tripId) as any[];
  const activitiesByDay: Record<string, any[]> = {};
  for (const a of activities) {
    if (!activitiesByDay[a.day_id]) activitiesByDay[a.day_id] = [];
    activitiesByDay[a.day_id].push(a);
  }

  // Checklist items
  const checklist = db.prepare(`SELECT * FROM checklist_items WHERE trip_id = ? ORDER BY category ASC, created_at ASC`).all(tripId) as any[];

  // Expenses
  const expenses = db.prepare(`
    SELECT e.*, u.name as paid_by_name FROM expenses e
    JOIN users u ON e.paid_by = u.id
    WHERE e.trip_id = ?
    ORDER BY e.date ASC
  `).all(tripId) as any[];
  const totalExpenses = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  // Members
  const members = db.prepare(`
    SELECT u.name, u.email FROM trip_members tm
    JOIN users u ON tm.user_id = u.id
    WHERE tm.trip_id = ?
  `).all(tripId) as any[];
  const owner = db.prepare("SELECT name, email FROM users WHERE id = ?").get(trip.owner_id) as any;

  res.json({
    trip: {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      status: trip.status,
      notes: trip.notes,
      budget_amount: trip.budget_amount,
      currency: trip.currency,
    },
    activitiesByDay,
    checklist,
    expenses,
    totalExpenses,
    members: [{ name: owner?.name, email: owner?.email }, ...members],
  });
});

export default router;
