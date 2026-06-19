import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import { sendInviteEmail } from "../email";
import crypto from "crypto";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, (req, res) => {
  const trip = db.prepare("SELECT owner_id FROM trips WHERE id = ?").get(req.params.tripId) as any;
  const members = db.prepare(`SELECT u.id, u.name, u.email, u.avatar_color, tm.role, tm.joined_at FROM trip_members tm JOIN users u ON tm.user_id = u.id WHERE tm.trip_id = ? AND tm.user_id != ?`).all(req.params.tripId, trip?.owner_id ?? "");
  res.json(members);
});

router.get("/pending-invites", requireAuth, (req, res) => {
  const invites = db.prepare(`SELECT id, email, status, created_at FROM invites WHERE trip_id = ? AND status = 'pending' ORDER BY created_at DESC`).all(req.params.tripId);
  res.json(invites);
});

router.post("/invite", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { email } = req.body;
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.tripId) as any;
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  // Block if already a member
  const existingMember = db.prepare(`SELECT u.id FROM trip_members tm JOIN users u ON tm.user_id = u.id WHERE tm.trip_id = ? AND u.email = ?`).get(req.params.tripId, email);
  if (existingMember) return res.status(409).json({ error: "This person is already a member of the trip." });

  // Block if already has a pending invite
  const existingInvite = db.prepare("SELECT id FROM invites WHERE trip_id = ? AND email = ? AND status = 'pending'").get(req.params.tripId, email);
  if (existingInvite) return res.status(409).json({ error: "An invite has already been sent to this email." });

  const inviter = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO invites (id, trip_id, email, token, expires_at) VALUES (?, ?, ?, ?, ?)").run(crypto.randomUUID(), req.params.tripId, email, token, expiresAt);

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const sent = await sendInviteEmail(email, trip.title, inviter.name, token, appUrl);

  res.json({ ok: true, emailSent: sent, inviteUrl: `${appUrl}/invite/${token}` });
});

router.get("/invite/:token", (req, res) => {
  const invite = db.prepare("SELECT * FROM invites WHERE token = ? AND status = 'pending'").get(req.params.token) as any;
  if (!invite) return res.status(404).json({ error: "Invite not found or expired" });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: "Invite expired" });
  const trip = db.prepare("SELECT id, title, destination, start_date, end_date FROM trips WHERE id = ?").get(invite.trip_id);
  res.json({ invite, trip });
});

router.post("/invite/:token/accept", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const invite = db.prepare("SELECT * FROM invites WHERE token = ? AND status = 'pending'").get(req.params.token) as any;
  if (!invite || new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: "Invite invalid" });
  const trip = db.prepare("SELECT owner_id FROM trips WHERE id = ?").get(invite.trip_id) as any;
  const isOwner = trip?.owner_id === userId;
  const already = db.prepare("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?").get(invite.trip_id, userId);
  if (!already && !isOwner) {
    db.prepare("INSERT INTO trip_members (id, trip_id, user_id, role) VALUES (?, ?, ?, 'member')").run(crypto.randomUUID(), invite.trip_id, userId);
  }
  db.prepare("UPDATE invites SET status = 'accepted' WHERE token = ?").run(req.params.token);
  res.json({ ok: true, tripId: invite.trip_id });
});

router.delete("/invites/:inviteId", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.tripId) as any;
  if (!trip || trip.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
  db.prepare("UPDATE invites SET status = 'revoked' WHERE id = ? AND trip_id = ?").run(req.params.inviteId, req.params.tripId);
  res.json({ ok: true });
});

router.delete("/:memberId", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const trip = db.prepare("SELECT * FROM trips WHERE id = ?").get(req.params.tripId) as any;
  if (!trip || trip.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
  db.prepare("DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?").run(req.params.tripId, req.params.memberId);
  res.json({ ok: true });
});

export default router;
