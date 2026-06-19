import { Router } from "express";
import db from "../db";
import { hashPassword, verifyPassword, signToken } from "../auth";
import crypto from "crypto";

const router = Router();

router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email already registered" });
  const id = crypto.randomUUID();
  const colors = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#10b981","#3b82f6","#14b8a6"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  db.prepare("INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)").run(id, name, email, hashPassword(password), color);
  const token = signToken(id);
  res.json({ token, user: { id, name, email, avatar_color: color } });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
  if (!user || !verifyPassword(password, user.password_hash)) return res.status(401).json({ error: "Invalid credentials" });
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color } });
});

export default router;
