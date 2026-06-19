import { Router } from "express";
import db from "../db";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

router.get("/", requireAuth, (req, res) => {
  const expenses = db.prepare(`SELECT e.*, u.name as paid_by_name, u.avatar_color as paid_by_color FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.trip_id = ? ORDER BY e.date DESC, e.created_at DESC`).all(req.params.tripId);
  res.json(expenses.map((e: any) => ({ ...e, split_among: JSON.parse(e.split_among) })));
});

router.post("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const { title, amount, currency = "USD", category = "other", split_among = [], date, notes = "" } = req.body;
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO expenses (id, trip_id, paid_by, title, amount, currency, category, split_among, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, req.params.tripId, userId, title, amount, currency, category, JSON.stringify(split_among), date, notes);
  const expense = db.prepare(`SELECT e.*, u.name as paid_by_name, u.avatar_color as paid_by_color FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.id = ?`).get(id) as any;
  res.json({ ...expense, split_among: JSON.parse(expense.split_among) });
});

router.delete("/:expenseId", requireAuth, (req, res) => {
  db.prepare("DELETE FROM expenses WHERE id = ? AND trip_id = ?").run(req.params.expenseId, req.params.tripId);
  res.json({ ok: true });
});

// Calculate balances: who owes whom
router.get("/balances", requireAuth, (req, res) => {
  const expenses = db.prepare(`SELECT e.*, u.name as paid_by_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.trip_id = ?`).all(req.params.tripId) as any[];
  const balances: Record<string, number> = {};

  for (const expense of expenses) {
    const splitAmong: string[] = JSON.parse(expense.split_among);
    if (splitAmong.length === 0) continue;
    const share = expense.amount / splitAmong.length;
    balances[expense.paid_by] = (balances[expense.paid_by] || 0) + expense.amount;
    for (const uid of splitAmong) {
      balances[uid] = (balances[uid] || 0) - share;
    }
  }

  // Simplify debts
  const settlements: { from: string; to: string; amount: number }[] = [];
  const pos = Object.entries(balances).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1]);
  const neg = Object.entries(balances).filter(([, v]) => v < -0.01).sort((a, b) => a[1] - b[1]);
  let i = 0, j = 0;
  const posArr = pos.map(([id, amt]) => ({ id, amt }));
  const negArr = neg.map(([id, amt]) => ({ id, amt: -amt }));
  while (i < posArr.length && j < negArr.length) {
    const settle = Math.min(posArr[i].amt, negArr[j].amt);
    settlements.push({ from: negArr[j].id, to: posArr[i].id, amount: Math.round(settle * 100) / 100 });
    posArr[i].amt -= settle;
    negArr[j].amt -= settle;
    if (posArr[i].amt < 0.01) i++;
    if (negArr[j].amt < 0.01) j++;
  }

  const members = db.prepare(`SELECT u.id, u.name FROM trip_members tm JOIN users u ON tm.user_id = u.id WHERE tm.trip_id = ? UNION SELECT u.id, u.name FROM trips t JOIN users u ON t.owner_id = u.id WHERE t.id = ?`).all(req.params.tripId, req.params.tripId) as any[];
  const memberMap = Object.fromEntries(members.map((m: any) => [m.id, m.name]));

  res.json({ balances, settlements: settlements.map(s => ({ ...s, fromName: memberMap[s.from], toName: memberMap[s.to] })) });
});

export default router;
