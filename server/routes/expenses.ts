import { Router, Request, Response, NextFunction } from "express";
import { query, queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });
const wrap = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);

router.get("/", requireAuth, wrap(async (req, res) => {
  const expenses = await query(
    `SELECT e.*, COALESCE(u.name, 'Unknown') as paid_by_name, COALESCE(u.avatar_color, '#6366f1') as paid_by_color
     FROM expenses e LEFT JOIN users u ON e.paid_by = u.id
     WHERE e.trip_id = ? ORDER BY e.date DESC, e.created_at DESC`,
    [req.params.tripId]
  );
  res.json((expenses as any[]).map((e: any) => ({
    ...e,
    split_among: (() => { try { return JSON.parse(e.split_among || "[]"); } catch { return []; } })(),
  })));
}));

router.post("/", requireAuth, wrap(async (req, res) => {
  const userId = (req as any).userId;
  const { title, amount, currency = "USD", category = "other", split_among = [], date, notes = "" } = req.body;
  const id = crypto.randomUUID();
  await execute(
    "INSERT INTO expenses (id, trip_id, paid_by, user_id, title, amount, currency, category, split_among, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, req.params.tripId, userId, userId, title, amount, currency, category, JSON.stringify(split_among), date, notes]
  );
  const expense = await queryOne(
    `SELECT e.*, COALESCE(u.name, 'Unknown') as paid_by_name, COALESCE(u.avatar_color, '#6366f1') as paid_by_color
     FROM expenses e LEFT JOIN users u ON e.paid_by = u.id WHERE e.id = ?`,
    [id]
  ) as any;
  res.json({ ...expense, split_among: (() => { try { return JSON.parse(expense.split_among || "[]"); } catch { return []; } })() });
}));

router.delete("/:expenseId", requireAuth, wrap(async (req, res) => {
  await execute("DELETE FROM expenses WHERE id = ? AND trip_id = ?", [req.params.expenseId, req.params.tripId]);
  res.json({ ok: true });
}));

router.get("/balances", requireAuth, wrap(async (req, res) => {
  const expenses = await query(
    `SELECT e.*, u.name as paid_by_name FROM expenses e LEFT JOIN users u ON e.paid_by = u.id WHERE e.trip_id = ?`,
    [req.params.tripId]
  ) as any[];
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    const splitAmong: string[] = (() => { try { return JSON.parse(expense.split_among || "[]"); } catch { return []; } })();
    if (splitAmong.length === 0) continue;
    const share = expense.amount / splitAmong.length;
    balances[expense.paid_by] = (balances[expense.paid_by] || 0) + expense.amount;
    for (const uid of splitAmong) {
      balances[uid] = (balances[uid] || 0) - share;
    }
  }

  const settlements: { from: string; to: string; amount: number }[] = [];
  const posArr = Object.entries(balances).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]).map(([id, amt]) => ({ id, amt }));
  const negArr = Object.entries(balances).filter(([, v]) => v < -0.01).sort((a, b) => a[1] - b[1]).map(([id, amt]) => ({ id, amt: -amt }));
  let i = 0, j = 0;
  while (i < posArr.length && j < negArr.length) {
    const settle = Math.min(posArr[i].amt, negArr[j].amt);
    settlements.push({ from: negArr[j].id, to: posArr[i].id, amount: Math.round(settle * 100) / 100 });
    posArr[i].amt -= settle;
    negArr[j].amt -= settle;
    if (posArr[i].amt < 0.01) i++;
    if (negArr[j].amt < 0.01) j++;
  }

  const members = await query(
    `SELECT u.id, u.name FROM trip_members tm JOIN users u ON tm.user_id = u.id WHERE tm.trip_id = ?
     UNION SELECT u.id, u.name FROM trips t JOIN users u ON t.owner_id = u.id WHERE t.id = ?`,
    [req.params.tripId, req.params.tripId]
  ) as any[];
  const memberMap = Object.fromEntries(members.map((m: any) => [m.id, m.name]));

  res.json({ balances, settlements: settlements.map(s => ({ ...s, fromName: memberMap[s.from], toName: memberMap[s.to] })) });
}));

export default router;
