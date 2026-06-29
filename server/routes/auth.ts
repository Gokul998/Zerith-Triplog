import { Router } from "express";
import { queryOne, execute } from "../db/mysql";
import { hashPassword, verifyPassword, signToken } from "../auth";
import crypto from "crypto";

const router = Router();

function effectivePlan(user: any): string {
  if (user.plan === "pro") return "pro";
  if (user.plan === "trial" && user.trial_ends_at && new Date(user.trial_ends_at) > new Date()) return "trial";
  return "free";
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
  const existing = await queryOne("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) return res.status(409).json({ error: "Email already registered" });
  const id = crypto.randomUUID();
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#10b981","#3b82f6","#14b8a6"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await execute(
    "INSERT INTO users (id, name, email, password_hash, avatar_color, plan, trial_ends_at) VALUES (?, ?, ?, ?, ?, 'trial', ?)",
    [id, name, email, hashPassword(password), color, trialEnds]
  );
  const token = signToken(id);
  res.json({ token, user: { id, name, email, avatar_color: color, plan: "trial", trial_ends_at: trialEnds } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await queryOne<any>("SELECT * FROM users WHERE email = ?", [email]);
  if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color, plan: effectivePlan(user), trial_ends_at: user.trial_ends_at } });
});

export default router;
