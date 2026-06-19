import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import webpush from "web-push";
import crypto from "crypto";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:" + (process.env.VAPID_EMAIL || "admin@triplog.app"),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const router = Router();

router.get("/vapid-public-key", (_, res) => {
  const keys = generateVapidIfNeeded();
  res.json({ publicKey: keys.publicKey });
});

function generateVapidIfNeeded() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  const keys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  webpush.setVapidDetails("mailto:admin@triplog.app", keys.publicKey, keys.privateKey);
  return keys;
}

router.post("/subscribe", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const subscription = req.body;
  db.prepare("UPDATE users SET push_subscription = ? WHERE id = ?").run(JSON.stringify(subscription), userId);
  res.json({ ok: true });
});

router.get("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const notifs = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(userId);
  res.json(notifs);
});

router.put("/:id/read", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  db.prepare("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?").run(req.params.id, userId);
  res.json({ ok: true });
});

router.put("/read-all", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(userId);
  res.json({ ok: true });
});

let _io: any = null;
export function setNotifIo(io: any) { _io = io; }

export async function sendPushToUser(userId: string, title: string, body: string, tripId?: string) {
  const user = db.prepare("SELECT push_subscription FROM users WHERE id = ?").get(userId) as any;
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO notifications (id, user_id, trip_id, title, body) VALUES (?, ?, ?, ?, ?)").run(id, userId, tripId ?? null, title, body);
  // Emit real-time socket event to user
  if (_io) _io.to(`user:${userId}`).emit("notification", { id, user_id: userId, trip_id: tripId ?? null, title, body, read: 0, created_at: new Date().toISOString() });
  if (user?.push_subscription) {
    try {
      await webpush.sendNotification(JSON.parse(user.push_subscription), JSON.stringify({ title, body, tripId }));
    } catch (e) {
      console.error("Push failed:", e);
    }
  }
}

export default router;
