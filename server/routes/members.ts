import { Router, Request, Response, NextFunction } from "express";
import { query, queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import { sendInviteEmail } from "../email";
import crypto from "crypto";

const router = Router({ mergeParams: true });

const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

router.get("/", requireAuth, wrap(async (req, res) => {
  const trip = await queryOne("SELECT owner_id FROM trips WHERE id = ?", [req.params.tripId]) as any;
  const members = await query(`SELECT u.id, u.name, u.email, u.avatar_color, tm.role, tm.joined_at FROM trip_members tm JOIN users u ON tm.user_id = u.id WHERE tm.trip_id = ? AND tm.user_id != ?`, [req.params.tripId, trip?.owner_id ?? ""]);
  res.json(members);
}));

router.get("/pending-invites", requireAuth, wrap(async (req, res) => {
  const invites = await query(`SELECT id, email, status, created_at FROM invites WHERE trip_id = ? AND status = 'pending' ORDER BY created_at DESC`, [req.params.tripId]);
  res.json(invites);
}));

router.post("/invite", requireAuth, wrap(async (req, res) => {
  const userId = (req as any).userId;
  const { email } = req.body;
  const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [req.params.tripId]) as any;
  if (!trip) return res.status(404).json({ error: "Trip not found" });

  const existingMember = await queryOne(`SELECT u.id FROM trip_members tm JOIN users u ON tm.user_id = u.id WHERE tm.trip_id = ? AND u.email = ?`, [req.params.tripId, email]);
  if (existingMember) return res.status(409).json({ error: "This person is already a member of the trip." });

  const existingInvite = await queryOne("SELECT id FROM invites WHERE trip_id = ? AND email = ? AND status = 'pending'", [req.params.tripId, email]);
  if (existingInvite) return res.status(409).json({ error: "An invite has already been sent to this email." });

  const inviter = await queryOne("SELECT * FROM users WHERE id = ?", [userId]) as any;
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace("T", " ");

  await execute(
    "INSERT INTO invites (id, trip_id, invited_by, email, token, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [crypto.randomUUID(), req.params.tripId, userId, email, token, expiresAt]
  );

  const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const emailSent = await sendInviteEmail(email, trip.title, inviter.name, token, appUrl);

  res.json({ ok: true, emailSent, inviteUrl: `${appUrl}/invite/${token}` });
}));

router.get("/invite/:token", wrap(async (req, res) => {
  const invite = await queryOne("SELECT * FROM invites WHERE token = ? AND status = 'pending'", [req.params.token]) as any;
  if (!invite) return res.status(404).json({ error: "Invite not found or expired" });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: "Invite expired" });
  const trip = await queryOne("SELECT id, title, destination, start_date, end_date FROM trips WHERE id = ?", [invite.trip_id]);
  res.json({ invite, trip });
}));

router.post("/invite/:token/accept", requireAuth, wrap(async (req, res) => {
  const userId = (req as any).userId;
  const invite = await queryOne("SELECT * FROM invites WHERE token = ? AND status = 'pending'", [req.params.token]) as any;
  if (!invite || new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: "Invite invalid" });
  const trip = await queryOne("SELECT owner_id FROM trips WHERE id = ?", [invite.trip_id]) as any;
  const isOwner = trip?.owner_id === userId;
  const already = await queryOne("SELECT 1 FROM trip_members WHERE trip_id = ? AND user_id = ?", [invite.trip_id, userId]);
  if (!already && !isOwner) {
    await execute("INSERT INTO trip_members (id, trip_id, user_id, role) VALUES (?, ?, ?, 'member')", [crypto.randomUUID(), invite.trip_id, userId]);
  }
  await execute("UPDATE invites SET status = 'accepted' WHERE token = ?", [req.params.token]);
  res.json({ ok: true, tripId: invite.trip_id });
}));

router.delete("/invites/:inviteId", requireAuth, wrap(async (req, res) => {
  const userId = (req as any).userId;
  const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [req.params.tripId]) as any;
  if (!trip || trip.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
  await execute("UPDATE invites SET status = 'revoked' WHERE id = ? AND trip_id = ?", [req.params.inviteId, req.params.tripId]);
  res.json({ ok: true });
}));

router.delete("/:memberId", requireAuth, wrap(async (req, res) => {
  const userId = (req as any).userId;
  const trip = await queryOne("SELECT * FROM trips WHERE id = ?", [req.params.tripId]) as any;
  if (!trip || trip.owner_id !== userId) return res.status(403).json({ error: "Forbidden" });
  await execute("DELETE FROM trip_members WHERE trip_id = ? AND user_id = ?", [req.params.tripId, req.params.memberId]);
  res.json({ ok: true });
}));

export default router;
