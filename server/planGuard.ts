import { Request, Response, NextFunction } from "express";
import { queryOne, query } from "./db/mysql";

// Feature matrix per plan
// free   → 3 trips, 2 members, no AI, no drive
// basic  → unlimited trips, 5 members, core AI (packing + budget insights), no receipt scan / ai-chat / drive
// pro    → unlimited everything, all AI, drive
// trial  → same as pro for 14 days

export const LIMITS = {
  free:  { trips: 3,        members: 2 },
  basic: { trips: Infinity, members: 5 },
  pro:   { trips: Infinity, members: Infinity },
  trial: { trips: Infinity, members: Infinity },
};

export function effectivePlan(user: any): "free" | "basic" | "pro" | "trial" {
  if (user.plan === "pro") return "pro";
  if (user.plan === "basic") return "basic";
  if (user.plan === "trial" && user.trial_ends_at && new Date(user.trial_ends_at) > new Date()) return "trial";
  return "free";
}

async function getUser(userId: string) {
  return queryOne<any>("SELECT id, plan, trial_ends_at FROM users WHERE id = ?", [userId]);
}

// Require at least Basic plan (packing AI, budget insights)
export function requireBasic(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    if (plan === "free") {
      return res.status(402).json({
        error: "upgrade_required",
        message: "This feature requires TripLog Basic or Pro. Upgrade to unlock AI features.",
      });
    }
    next();
  })().catch(next);
}

// Require Pro plan (receipt scanner, AI chat, drive, trip story)
export function requirePro(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    if (plan === "free" || plan === "basic") {
      return res.status(402).json({
        error: "upgrade_required",
        message: "This feature requires TripLog Pro.",
      });
    }
    next();
  })().catch(next);
}

// Enforces trip creation limit
export function requireTripSlot(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    const limit = LIMITS[plan].trips;
    if (limit === Infinity) return next();

    const rows = await query("SELECT COUNT(*) as cnt FROM trips WHERE owner_id = ?", [userId]) as any[];
    const count = rows[0]?.cnt ?? 0;
    if (count >= limit) {
      return res.status(402).json({
        error: "upgrade_required",
        message: `Free plan allows up to ${limit} trips. Upgrade to Basic or Pro for unlimited trips.`,
      });
    }
    next();
  })().catch(next);
}

// Enforces member limit per trip
export function requireMemberSlot(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    const limit = LIMITS[plan].members;
    if (limit === Infinity) return next();

    const tripId = req.params.tripId;
    const rows = await query("SELECT COUNT(*) as cnt FROM trip_members WHERE trip_id = ?", [tripId]) as any[];
    const count = rows[0]?.cnt ?? 0;
    if (count >= limit) {
      return res.status(402).json({
        error: "upgrade_required",
        message: `Your plan allows up to ${limit} members per trip. Upgrade to Pro for unlimited members.`,
      });
    }
    next();
  })().catch(next);
}

// Drive requires Pro
export function requireDriveAccess(req: Request, res: Response, next: NextFunction) {
  (async () => {
    const userId = (req as any).userId;
    const user = await getUser(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    const plan = effectivePlan(user);
    if (plan === "free" || plan === "basic") {
      return res.status(402).json({ error: "upgrade_required", message: "Drive storage requires TripLog Pro." });
    }
    next();
  })().catch(next);
}
