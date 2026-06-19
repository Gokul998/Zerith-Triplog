import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

router.post("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { tripId } = req.params;

  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(tripId) as any;
  if (!trip) return res.status(404).json({ error: "Not found" });
  const isMember = db.prepare("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?").get(tripId, userId);
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
  db.prepare(`INSERT INTO trips (id, title, destination, start_date, end_date, status, notes, currency, budget_amount, owner_id)
    VALUES (?, ?, ?, ?, ?, 'planning', ?, ?, ?, ?)`
  ).run(newTripId, `Copy of ${trip.title}`, trip.destination, fmt(newStart), fmt(newEnd), trip.notes, trip.currency, trip.budget_amount, userId);

  // Copy activities with shifted dates
  const activities = db.prepare("SELECT * FROM activities WHERE trip_id = ? ORDER BY sort_order ASC").all(tripId) as any[];
  for (const act of activities) {
    const newActId = crypto.randomUUID();
    const newDayId = shiftDate(act.day_id);
    db.prepare(`INSERT INTO activities (id, trip_id, day_id, title, description, location, category, start_time, end_time, cost, currency, status, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(newActId, newTripId, newDayId, act.title, act.description, act.location, act.category, act.start_time, act.end_time, act.cost, act.currency, act.status, act.sort_order);
  }

  const newTrip = db.prepare("SELECT * FROM trips WHERE id = ?").get(newTripId);
  res.json(newTrip);
});

export default router;
