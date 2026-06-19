import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import cors from "cors";
import crypto from "crypto";
import db from "./db";
import { verifyToken } from "./auth";
import { sendPushToUser, setNotifIo } from "./routes/notifications";

import authRoutes from "./routes/auth";
import tripRoutes from "./routes/trips";
import memberRoutes from "./routes/members";
import messageRoutes from "./routes/messages";
import checklistRoutes from "./routes/checklist";
import expenseRoutes from "./routes/expenses";
import notifRoutes from "./routes/notifications";
import itineraryRoutes from "./routes/itinerary";
import memoriesRoutes from "./routes/memories";
import suggestionsRoutes from "./routes/suggestions";
import plannerRoutes from "./routes/planner";
import aiChatRoutes from "./routes/ai-chat";
import budgetInsightsRoutes from "./routes/budget-insights";
import driveRoutes, { googleAuthCallback } from "./routes/drive";
import packingAiRoutes from "./routes/packing-ai";
import tripSummaryRoutes from "./routes/trip-summary";
import restaurantsRoutes from "./routes/restaurants";
import shareRoutes, { publicShareRouter } from "./routes/share";
import cloneRoutes from "./routes/clone";
import receiptScannerRoutes from "./routes/receipt-scanner";
import visaRoutes from "./routes/visa";
import briefRoutes from "./routes/brief";
import googleAuthRoutes from "./routes/google-auth";

const app = express();
const httpServer = createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use("/api/uploads", express.static(path.join(process.cwd(), ".data", "uploads")));
app.get("/api/health", (_, res) => res.json({ status: "ok", ts: Date.now() }));

app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
// Top-level invite lookup (no tripId needed — token contains trip reference)
app.get("/api/trips/x/members/invite/:token", (req, res) => {
  const invite = db.prepare("SELECT * FROM invites WHERE token = ? AND status = 'pending'").get(req.params.token) as any;
  if (!invite) return res.status(404).json({ error: "Invite not found or expired" });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: "Invite expired" });
  const trip = db.prepare("SELECT id, title, destination, start_date, end_date FROM trips WHERE id = ?").get(invite.trip_id);
  res.json({ invite, trip });
});
app.use("/api/trips/:tripId/members", memberRoutes);
app.use("/api/trips/:tripId/messages", messageRoutes);
app.use("/api/trips/:tripId/checklist", checklistRoutes);
app.use("/api/trips/:tripId/expenses", expenseRoutes);
app.use("/api/notifications", notifRoutes);
app.use("/api/trips/:tripId/itinerary", itineraryRoutes);
app.use("/api/trips/:tripId/memories", memoriesRoutes);
app.use("/api/trips/:tripId/suggestions", suggestionsRoutes);
app.use("/api/trips/:tripId/planner", plannerRoutes);
app.use("/api/trips/:tripId/ai-chat", aiChatRoutes);
app.use("/api/trips/:tripId/budget", budgetInsightsRoutes);
app.use("/api/trips/:tripId/drive", driveRoutes);
app.use("/api/trips/:tripId/packing", packingAiRoutes);
app.use("/api/trips/:tripId/summary", tripSummaryRoutes);
app.use("/api/trips/:tripId/restaurants", restaurantsRoutes);
app.use("/api/trips/:tripId/share", shareRoutes);
app.use("/api/trips/:tripId/clone", cloneRoutes);
app.use("/api/trips/:tripId/brief", briefRoutes);
app.use("/api/trips/:tripId/receipts", receiptScannerRoutes);
app.use("/api/visa", visaRoutes);
app.use("/api/share", publicShareRouter());
app.get("/api/auth/google/callback", googleAuthCallback);

app.get("/api/weather", async (req, res) => {
  const { lat, lon, start_date, end_date } = req.query;
  if (!lat || !lon || !start_date || !end_date) return res.status(400).json({ error: "Missing params" });
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode&timezone=auto&start_date=${start_date}&end_date=${end_date}`;
    const r = await fetch(url);
    res.json(await r.json());
  } catch (e) {
    res.status(500).json({ error: "Weather fetch failed" });
  }
});

app.get("/api/geocode", async (req, res) => {
  const { q } = req.query;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q as string)}&format=json&limit=1`, { headers: { "User-Agent": "TripLog/1.0" } });
    res.json(await r.json());
  } catch {
    res.status(500).json({ error: "Geocode failed" });
  }
});

// Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const payload = verifyToken(token);
  if (!payload) return next(new Error("Unauthorized"));
  (socket as any).userId = payload.userId;
  next();
});

setNotifIo(io);

io.on("connection", (socket) => {
  const userId = (socket as any).userId;
  // Join personal room for notifications
  socket.join(`user:${userId}`);

  socket.on("join-trip", (tripId: string) => {
    socket.join(`trip:${tripId}`);
  });

  socket.on("leave-trip", (tripId: string) => {
    socket.leave(`trip:${tripId}`);
  });

  socket.on("send-message", async (data: { tripId: string; content: string; type?: string }) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
    if (!user) return;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO messages (id, trip_id, user_id, content, type) VALUES (?, ?, ?, ?, ?)").run(id, data.tripId, userId, data.content, data.type || "text");
    const message = { id, trip_id: data.tripId, user_id: userId, user_name: user.name, avatar_color: user.avatar_color, content: data.content, type: data.type || "text", created_at: new Date().toISOString() };
    io.to(`trip:${data.tripId}`).emit("new-message", message);

    // Notify other members
    const members = db.prepare(`
      SELECT tm.user_id FROM trip_members tm WHERE tm.trip_id = ? AND tm.user_id != ?
      UNION SELECT owner_id as user_id FROM trips WHERE id = ? AND owner_id != ?
    `).all(data.tripId, userId, data.tripId, userId) as any[];
    for (const m of members) {
      await sendPushToUser(m.user_id, `${user.name} in trip chat`, data.content.slice(0, 80), data.tripId);
    }
  });

  socket.on("typing", (data: { tripId: string; isTyping: boolean }) => {
    const user = db.prepare("SELECT name FROM users WHERE id = ?").get(userId) as any;
    socket.to(`trip:${data.tripId}`).emit("user-typing", { userId, userName: user?.name, isTyping: data.isTyping });
  });

  socket.on("checklist-update", (data: { tripId: string; item: any }) => {
    socket.to(`trip:${data.tripId}`).emit("checklist-updated", data.item);
  });

  socket.on("itinerary-change", (data: { tripId: string; type: "added" | "updated" | "deleted"; activity: any }) => {
    socket.to(`trip:${data.tripId}`).emit("itinerary-changed", data);
  });

  socket.on("memory-change", (data: { tripId: string; type: "added" | "updated" | "deleted"; memory: any }) => {
    socket.to(`trip:${data.tripId}`).emit("memory-changed", data);
  });
});

const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;
httpServer.listen(PORT, () => console.log(`Backend running on :${PORT}`));

export { io };
