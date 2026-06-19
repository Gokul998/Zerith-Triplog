import { Router } from "express";
import crypto from "crypto";
import { queryOne, execute } from "../db/mysql";
import { signToken } from "../auth";

const router = Router();

// Read at request time so Railway env vars are always current
function cfg() {
  return {
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/auth/google/callback",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  };
}

// Step 1: Redirect to Google
router.get("/", (req, res) => {
  const { CLIENT_ID, REDIRECT_URI } = cfg();
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
  const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, FRONTEND_URL } = cfg();
  const { code, error } = req.query as { code?: string; error?: string };

  if (error || !code) {
    return res.redirect(`${FRONTEND_URL}?auth_error=google_denied`);
  }

  try {
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

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userRes.json() as any;
    const { email, name } = googleUser;

    let user = await queryOne<any>("SELECT * FROM users WHERE email = ?", [email]);
    let isNew = false;
    if (!user) {
      isNew = true;
      const id = crypto.randomUUID();
      const colors = ["#6366f1","#8b5cf6","#ec4899","#f43f5e","#f97316","#10b981","#3b82f6","#14b8a6"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      await execute("INSERT INTO users (id, name, email, password_hash, avatar_color) VALUES (?, ?, ?, ?, ?)",
        [id, name || email.split("@")[0], email, "", color]);
      user = await queryOne<any>("SELECT * FROM users WHERE id = ?", [id]);
    }

    const token = signToken(user.id);
    const userData = encodeURIComponent(JSON.stringify({
      id: user.id, name: user.name, email: user.email, avatar_color: user.avatar_color,
    }));

    res.redirect(`${FRONTEND_URL}/auth/callback?token=${token}&user=${userData}${isNew ? "&new=1" : ""}`);
  } catch (err: any) {
    console.error("Google OAuth error:", err.message);
    res.redirect(`${FRONTEND_URL}?auth_error=google_failed`);
  }
});

export default router;
