import { Request, Response, NextFunction } from "express";
import { queryOne, query } from "./db/mysql";

export const LIMITS = {
  free: { trips: 3, members: 2 },
  trial: { trips: Infinity, members: Infinity },
  pro: { trips: Infinity, members: Infinity },
};

export function effectivePlan(user: any): "free" | "trial" | "pro" {
  if (user.plan === "pro") return "pro";
  if (user.plan === "trial" && user.trial_ends_at && new Date(user.trial_ends_at) > new Date()) return "trial";
  return "free";
}

async function getUser(userId: string) {
  return queryOne<any>("SELECT id, plan, trial_ends_at FROM users WHERE id = ?", [userId]);
}

// Blocks AI-powered routes for free users
export function requirePro(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    if (plan === "free") {
      return res.status(402).json({ error: "upgrade_required", message: "This feature requires TripLog Pro. Upgrade to unlock AI features." });
    }
    next();
  })().catch(next);
}

// Enforces trip creation limit for free users
export function requireTripSlot(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    if (plan !== "free") return next();

    const rows = await query("SELECT COUNT(*) as cnt FROM trips WHERE owner_id = ?", [userId]) as any[];
    const count = rows[0]?.cnt ?? 0;
    if (count >= LIMITS.free.trips) {
      return res.status(402).json({
        error: "upgrade_required",
        message: `Free plan allows up to ${LIMITS.free.trips} trips. Upgrade to Pro for unlimited trips.`,
      });
    }
    next();
  })().catch(next);
}

// Enforces member limit per trip for free users
export function requireMemberSlot(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    if (plan !== "free") return next();

    const tripId = req.params.tripId;
    const rows = await query("SELECT COUNT(*) as cnt FROM trip_members WHERE trip_id = ?", [tripId]) as any[];
    const count = rows[0]?.cnt ?? 0;
    if (count >= LIMITS.free.members) {
      return res.status(402).json({
        error: "upgrade_required",
        message: `Free plan allows up to ${LIMITS.free.members} members per trip. Upgrade to Pro for unlimited members.`,
      });
    }
    next();
  })().catch(next);
}

// Blocks drive/file upload for free users
export function requireDriveAccess(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    if (plan === "free") {
      return res.status(402).json({ error: "upgrade_required", message: "Drive storage requires TripLog Pro." });
    }
    next();
  })().catch(next);
}
