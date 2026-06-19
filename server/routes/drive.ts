import { Router } from "express";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import db from "../db";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = `${process.env.APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
const BACKEND_REDIRECT = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/auth/google/callback`;

function makeOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, BACKEND_REDIRECT);
}

function getDriveClient(tokens: any) {
  const auth = makeOAuth2Client();
  auth.setCredentials(tokens);
  return google.drive({ version: "v3", auth });
}

// Add drive columns if not exist (migration)
try {
  db.exec(`ALTER TABLE users ADD COLUMN google_tokens TEXT`);
} catch {}
try {
  db.exec(`ALTER TABLE trips ADD COLUMN drive_folder_id TEXT`);
  db.exec(`ALTER TABLE trips ADD COLUMN drive_folder_url TEXT`);
} catch {}

// GET /api/auth/google/start?tripId=xxx&userId=xxx — initiate OAuth
// (mounted at top level in index.ts, not under /trips/:tripId)
export function googleAuthStart(req: any, res: any) {
  if (!CLIENT_ID) return res.status(400).json({ error: "Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.local" });
  const state = Buffer.from(JSON.stringify({ tripId: req.query.tripId, userId: req.query.userId })).toString("base64");
  const auth = makeOAuth2Client();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    state,
    prompt: "consent",
  });
  res.redirect(url);
}

// GET /api/auth/google/callback
export async function googleAuthCallback(req: any, res: any) {
  const { code, state } = req.query;
  const { tripId, userId } = JSON.parse(Buffer.from(state, "base64").toString());
  try {
    const auth = makeOAuth2Client();
    const { tokens } = await auth.getToken(code);
    db.prepare("UPDATE users SET google_tokens = ? WHERE id = ?").run(JSON.stringify(tokens), userId);
    // Redirect back to the trip memories page
    res.redirect(`${process.env.APP_URL || "http://localhost:3000"}/trips/${tripId}/memories?drive=connected`);
  } catch (err) {
    res.redirect(`${process.env.APP_URL || "http://localhost:3000"}/trips/${tripId}/memories?drive=error`);
  }
}

// GET /api/trips/:tripId/drive — get drive status
router.get("/", requireAuth, (req, res) => {
  const userId = (req as any).userId;
  const user = db.prepare("SELECT google_tokens FROM users WHERE id = ?").get(userId) as any;
  const trip = db.prepare("SELECT drive_folder_id, drive_folder_url FROM trips WHERE id = ?").get(req.params.tripId) as any;
  res.json({
    connected: !!user?.google_tokens,
    folderId: trip?.drive_folder_id || null,
    folderUrl: trip?.drive_folder_url || null,
  });
});

// POST /api/trips/:tripId/drive/create-folder — create Drive folder for trip
router.post("/create-folder", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const user = db.prepare("SELECT google_tokens FROM users WHERE id = ?").get(userId) as any;
  if (!user?.google_tokens) return res.status(400).json({ error: "Google Drive not connected" });

  const trip = db.prepare("SELECT title, drive_folder_id FROM trips WHERE id = ?").get(req.params.tripId) as any;
  if (trip?.drive_folder_id) {
    return res.json({ folderId: trip.drive_folder_id, folderUrl: trip.drive_folder_url });
  }

  try {
    const drive = getDriveClient(JSON.parse(user.google_tokens));
    const folder = await drive.files.create({
      requestBody: {
        name: `TripLog — ${trip.title}`,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id, webViewLink",
    });
    const folderId = folder.data.id!;
    const folderUrl = folder.data.webViewLink!;

    // Make folder shareable with anyone with the link
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { type: "anyone", role: "reader" },
    });

    db.prepare("UPDATE trips SET drive_folder_id = ?, drive_folder_url = ? WHERE id = ?").run(folderId, folderUrl, req.params.tripId);
    res.json({ folderId, folderUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/trips/:tripId/drive/upload/:memoryId — upload memory images to Drive
router.post("/upload/:memoryId", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const user = db.prepare("SELECT google_tokens FROM users WHERE id = ?").get(userId) as any;
  if (!user?.google_tokens) return res.status(400).json({ error: "Google Drive not connected" });

  const trip = db.prepare("SELECT title, drive_folder_id FROM trips WHERE id = ?").get(req.params.tripId) as any;
  if (!trip?.drive_folder_id) return res.status(400).json({ error: "Drive folder not created yet" });

  const memory = db.prepare("SELECT * FROM memories WHERE id = ? AND trip_id = ?").get(req.params.memoryId, req.params.tripId) as any;
  if (!memory) return res.status(404).json({ error: "Memory not found" });

  const images = db.prepare("SELECT * FROM memory_images WHERE memory_id = ?").all(req.params.memoryId) as any[];
  const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");

  try {
    const drive = getDriveClient(JSON.parse(user.google_tokens));

    // Create a subfolder for this memory
    const subFolder = await drive.files.create({
      requestBody: {
        name: memory.title,
        mimeType: "application/vnd.google-apps.folder",
        parents: [trip.drive_folder_id],
      },
      fields: "id, webViewLink",
    });
    const subFolderId = subFolder.data.id!;

    // Upload each image
    const uploaded: string[] = [];
    for (const img of images) {
      const filePath = path.join(UPLOADS_DIR, img.filename);
      if (!fs.existsSync(filePath)) continue;
      await drive.files.create({
        requestBody: { name: img.filename, parents: [subFolderId] },
        media: { mimeType: img.mime_type, body: fs.createReadStream(filePath) },
        fields: "id",
      });
      uploaded.push(img.id);
    }

    res.json({ ok: true, uploaded: uploaded.length, subFolderUrl: subFolder.data.webViewLink });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/trips/:tripId/drive/auth-url — get OAuth URL for this user+trip
router.get("/auth-url", requireAuth, (req, res) => {
  if (!CLIENT_ID) return res.status(400).json({ error: "not_configured" });
  const userId = (req as any).userId;
  const state = Buffer.from(JSON.stringify({ tripId: req.params.tripId, userId })).toString("base64");
  const auth = makeOAuth2Client();
  const url = auth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    state,
    prompt: "consent",
  });
  res.json({ url });
});

export default router;
