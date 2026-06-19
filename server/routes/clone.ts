import { Router } from "express";
import { query, queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

router.post("/", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { tripId } = req.params;

  const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [tripId]) as any;
  if (!trip) return res.status(404).json({ error: "Not found" });
  const isMember = await queryOne("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?", [tripId, userId]);
  if (trip.owner_id !== userId && !isMember) return res.status(403).json({ error: "Forbidden" });

  // Calculate date offset: new start = today, shift all dates proportionally
  const origStart = new Date(trip.start_date);
  const origEnd = new Date(trip.end_date);
  const tripDuration = origEnd.getTime() - origStart.getTime();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newStart = today;
  const newEnd = new Date(today.getTime() + tripDuration);

  const fmt = (d: Date) => d.toISOString().split("T")[0];
  const shiftDate = (dateStr: string) => {
    const orig = new Date(dateStr);
    const offset = orig.getTime() - origStart.getTime();
    return fmt(new Date(newStart.getTime() + offset));
  };

  const newTripId = crypto.randomUUID();
  await execute(`INSERT INTO trips (id, title, destination, start_date, end_date, status, notes, currency, budget_amount, owner_id)
    VALUES (?, ?, ?, ?, ?, 'planning', ?, ?, ?, ?)`,
    [newTripId, `Copy of ${trip.title}`, trip.destination, fmt(newStart), fmt(newEnd), trip.notes, trip.currency, trip.budget_amount, userId]);

  // Copy activities with shifted dates
  const activities = await query("SELECT * FROM activities WHERE trip_id = ? ORDER BY sort_order ASC", [tripId]) as any[];
  for (const act of activities) {
    const newActId = crypto.randomUUID();
    const newDayId = shiftDate(act.day_id);
    await execute(`INSERT INTO activities (id, trip_id, day_id, title, description, location, category, start_time, end_time, cost, currency, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newActId, newTripId, newDayId, act.title, act.description, act.location, act.category, act.start_time, act.end_time, act.cost, act.currency, act.status, act.sort_order]);
  }

  const newTrip = await queryOne("SELECT * FROM trips WHERE id = ?", [newTripId]);
  res.json(newTrip);
});

export default router;
