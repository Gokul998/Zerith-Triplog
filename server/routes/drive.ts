import { Router } from "express";
import { google } from "googleapis";
import fs from "fs";
import path from "path";
import { queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import { requireDriveAccess } from "../planGuard";

const router = Router({ mergeParams: true });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const BACKEND_REDIRECT = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"}/api/auth/google/callback`;

function makeOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, BACKEND_REDIRECT);
}

function getDriveClient(tokens: any) {
  const auth = makeOAuth2Client();
  auth.setCredentials(tokens);
  return google.drive({ version: "v3", auth });
}

export async function googleAuthCallback(req: any, res: any) {
  const { code, state } = req.query;
  const { tripId, userId } = JSON.parse(Buffer.from(state, "base64").toString());
  try {
    const auth = makeOAuth2Client();
    const { tokens } = await auth.getToken(code);
    await execute("UPDATE users SET google_tokens = ? WHERE id = ?", [JSON.stringify(tokens), userId]);
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/trips/${tripId}/memories?drive=connected`);
  } catch {
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/trips/${tripId}/memories?drive=error`);
  }
}

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const user = await queryOne("SELECT google_tokens FROM users WHERE id = ?", [userId]) as any;
    const trip = await queryOne("SELECT drive_folder_id, drive_folder_url FROM trips WHERE id = ?", [req.params.tripId]) as any;
    res.json({
      connected: !!user?.google_tokens,
      folderId: trip?.drive_folder_id || null,
      folderUrl: trip?.drive_folder_url || null,
    });
  } catch (err) { next(err); }
});

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

router.post("/create-folder", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const user = await queryOne("SELECT google_tokens FROM users WHERE id = ?", [userId]) as any;
    if (!user?.google_tokens) return res.status(400).json({ error: "Google Drive not connected" });

    const trip = await queryOne("SELECT title, drive_folder_id, drive_folder_url FROM trips WHERE id = ?", [req.params.tripId]) as any;
    if (trip?.drive_folder_id) return res.json({ folderId: trip.drive_folder_id, folderUrl: trip.drive_folder_url });

    const drive = getDriveClient(JSON.parse(user.google_tokens));
    const folder = await drive.files.create({
      requestBody: { name: `TripLog — ${trip.title}`, mimeType: "application/vnd.google-apps.folder" },
      fields: "id, webViewLink",
    });
    const folderId = folder.data.id!;
    const folderUrl = folder.data.webViewLink!;
    await drive.permissions.create({ fileId: folderId, requestBody: { type: "anyone", role: "reader" } });
    await execute("UPDATE trips SET drive_folder_id = ?, drive_folder_url = ? WHERE id = ?", [folderId, folderUrl, req.params.tripId]);
    res.json({ folderId, folderUrl });
  } catch (err: any) { next(err); }
});

router.post("/upload/:memoryId", requireAuth, requireDriveAccess, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const user = await queryOne("SELECT google_tokens FROM users WHERE id = ?", [userId]) as any;
    if (!user?.google_tokens) return res.status(400).json({ error: "Google Drive not connected" });

    const trip = await queryOne("SELECT title, drive_folder_id FROM trips WHERE id = ?", [req.params.tripId]) as any;
    if (!trip?.drive_folder_id) return res.status(400).json({ error: "Drive folder not created yet" });

    const memory = await queryOne("SELECT * FROM memories WHERE id = ? AND trip_id = ?", [req.params.memoryId, req.params.tripId]) as any;
    if (!memory) return res.status(404).json({ error: "Memory not found" });

    const { query: dbQuery } = await import("../db/mysql");
    const images = await dbQuery("SELECT * FROM memory_images WHERE memory_id = ?", [req.params.memoryId]) as any[];
    const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");
    const drive = getDriveClient(JSON.parse(user.google_tokens));

    const subFolder = await drive.files.create({
      requestBody: { name: memory.title, mimeType: "application/vnd.google-apps.folder", parents: [trip.drive_folder_id] },
      fields: "id, webViewLink",
    });
    const subFolderId = subFolder.data.id!;

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
  } catch (err: any) { next(err); }
});

export default router;
