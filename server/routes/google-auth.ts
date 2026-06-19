import { Router } from "express";
import crypto from "crypto";
import db from "../db";
import { signToken } from "../auth";

const router = Router();

const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/auth/google/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

// Step 1: Redirect to Google
router.get("/", (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// Step 2: Google callback — exchange code for user info
router.get("/callback", async (req, res) => {
  const { code, error } = req.query as { code?: string; error?: string };

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}?auth_error=google_denied`);
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json() as any;
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // Get user info from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json() as any;
    const { id: googleId, email, name, picture } = googleUser;

    // Find or create user
    let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (!user) {
      const id = crypto.randomUUID();
      const colors = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#10b981","#3b82f6","#14b8a6"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      db.prepare("INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)")
        .run(id, name || email.split("@")[0], email, "", color);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    }

    const token = signToken(user.id);
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color,
    }));

    // Redirect back to frontend with token
    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
  } catch (err: any) {
    console.error("Google OAuth error:", err.message);
    res.redirect(`${FRONTEND_URL}?auth_error=google_failed`);
  }
});

export default router;
