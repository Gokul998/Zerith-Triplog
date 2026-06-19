import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "triplog-dev-secret-change-in-prod";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const payload = verifyToken(auth.slice(7));
    if (!payload) return res.status(401).json({ error: "Invalid token" });
    const { queryOne } = await import("./db/mysql");
    const user = await queryOne("SELECT id FROM users WHERE id = ?", [payload.userId]);
    if (!user) return res.status(401).json({ error: "User not found" });
    (req as any).userId = payload.userId;
    next();
  } catch (err) {
    next(err);
  }
}
