import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require("archiver");
import { query, queryOne, execute } from "../db/mysql";
import { requireAuth } from "../auth";
import crypto from "crypto";

const router = Router({ mergeParams: true });

const UPLOADS_DIR = path.join(process.cwd(), ".data", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

async function memoryWithImages(memory: any) {
  const images = await query("SELECT * FROM memory_images WHERE memory_id = ? ORDER BY created_at ASC", [memory.id]);
  return { ...memory, images };
}

router.get("/", requireAuth, async (req, res) => {
  const memories = await query("SELECT * FROM memories WHERE trip_id = ? ORDER BY date DESC, created_at DESC", [req.params.tripId]);
  res.json(await Promise.all((memories as any[]).map(memoryWithImages)));
});

router.post("/", requireAuth, upload.array("images", 20), async (req, res) => {
  const userId = (req as any).userId;
  const { title, note = "", date, location = "", mood } = req.body;
  if (!title || !date) return res.status(400).json({ error: "title and date required" });
  const id = crypto.randomUUID();
  await execute("INSERT INTO memories (id, trip_id, user_id, title, note, date, location, mood) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [id, req.params.tripId, userId, title, note, date, location, mood || null]);

  const files = (req.files as Express.Multer.File[]) || [];
  for (const file of files) {
    await execute("INSERT INTO memory_images (id, memory_id, trip_id, filename, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), id, req.params.tripId, file.filename, file.mimetype, file.size]);
  }

  const memory = await queryOne("SELECT * FROM memories WHERE id = ?", [id]) as any;
  res.json(await memoryWithImages(memory));
});

router.put("/:memoryId", requireAuth, upload.array("images", 20), async (req, res) => {
  const existing = await queryOne("SELECT * FROM memories WHERE id = ? AND trip_id = ?", [req.params.memoryId, req.params.tripId]) as any;
  if (!existing) return res.status(404).json({ error: "Not found" });
  const { title, note, date, location, mood } = req.body;
  await execute("UPDATE memories SET title=COALESCE(?,title), note=COALESCE(?,note), date=COALESCE(?,date), location=COALESCE(?,location), mood=?, updated_at=NOW() WHERE id=?",
    [title, note, date, location, mood ?? existing.mood, req.params.memoryId]);

  const files = (req.files as Express.Multer.File[]) || [];
  for (const file of files) {
    await execute("INSERT INTO memory_images (id, memory_id, trip_id, filename, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)", [crypto.randomUUID(), req.params.memoryId, req.params.tripId, file.filename, file.mimetype, file.size]);
  }

  const memory = await queryOne("SELECT * FROM memories WHERE id = ?", [req.params.memoryId]) as any;
  res.json(await memoryWithImages(memory));
});

router.delete("/:memoryId", requireAuth, async (req, res) => {
  const images = await query("SELECT filename FROM memory_images WHERE memory_id = ?", [req.params.memoryId]) as any[];
  for (const img of images) {
    const filePath = path.join(UPLOADS_DIR, img.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  await execute("DELETE FROM memories WHERE id = ? AND trip_id = ?", [req.params.memoryId, req.params.tripId]);
  res.json({ ok: true });
});

router.delete("/:memoryId/images/:imageId", requireAuth, async (req, res) => {
  const img = await queryOne("SELECT filename FROM memory_images WHERE id = ? AND memory_id = ?", [req.params.imageId, req.params.memoryId]) as any;
  if (img) {
    const filePath = path.join(UPLOADS_DIR, img.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await execute("DELETE FROM memory_images WHERE id = ?", [req.params.imageId]);
  }
  res.json({ ok: true });
});

// Download all memory photos for a trip as a zip file
router.get("/download-zip", requireAuth, async (req, res) => {
  const tripId = req.params.tripId;
  const trip = await queryOne("SELECT title FROM trips WHERE id = ?", [tripId]) as any;
  const tripName = trip?.title?.replace(/[^a-z0-9]/gi, "_") || "trip";

  const images = await query(`
    SELECT mi.filename, mi.mime_type, m.title as memory_title, m.date
    FROM memory_images mi
    JOIN memories m ON m.id = mi.memory_id
    WHERE mi.trip_id = ?
    ORDER BY m.date ASC, mi.created_at ASC
  `, [tripId]) as any[];

  if (images.length === 0) {
    return res.status(404).json({ error: "No photos to download" });
  }

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${tripName}_memories.zip"`);

  const archive = archiver("zip", { zlib: { level: 5 } });
  archive.pipe(res);

  // Group images by memory title/date for folder structure
  const seen: Record<string, number> = {};
  for (const img of images) {
    const folderName = `${img.date || "unknown"}_${img.memory_title.replace(/[^a-z0-9]/gi, "_").slice(0, 30)}`;
    seen[folderName] = (seen[folderName] || 0) + 1;
    const ext = path.extname(img.filename) || ".jpg";
    const filePath = path.join(UPLOADS_DIR, img.filename);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: `${folderName}/photo_${seen[folderName]}${ext}` });
    }
  }

  archive.finalize();
});

export default router;
