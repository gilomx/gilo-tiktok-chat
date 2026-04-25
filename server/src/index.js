import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import { connectDb } from "./config/db.js";
import { env } from "./config/env.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import moderationRoutes from "./routes/moderationRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import stickerRoutes from "./routes/stickerRoutes.js";
import ttsRoutes from "./routes/ttsRoutes.js";
import { ensureInstallationRecord, getInstallationRecord } from "./services/appInstallationService.js";
import { connectOverlayRelay } from "./services/overlayRelayService.js";
import { registerSocket } from "./services/socketHub.js";
import { connectTikTokSource } from "./services/tiktokSourceService.js";

await connectDb();
await ensureInstallationRecord();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    methods: ["GET", "POST", "DELETE"]
  }
});

registerSocket(io);

app.use(cors({ origin: env.clientUrl }));
app.use(express.json({ limit: "5mb" }));
app.use("/uploads", express.static(env.uploadsDir));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/moderation", moderationRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/stickers", stickerRoutes);
app.use("/api/tts", ttsRoutes);

const clientDistPath = env.clientDistDir;
app.use(express.static(clientDistPath));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    next();
    return;
  }
  res.sendFile(path.join(clientDistPath, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({ error: error.message || "Error interno del servidor" });
});

io.on("connection", () => {
  console.info("Cliente Socket.IO conectado");
});

server.listen(env.port, () => {
  console.info(`API escuchando en http://localhost:${env.port}`);
  const installation = getInstallationRecord();
  console.info(`Overlay instalado con slug estable: ${installation.overlaySlug} (${installation.identitySource})`);
  connectOverlayRelay();
  connectTikTokSource();
});
