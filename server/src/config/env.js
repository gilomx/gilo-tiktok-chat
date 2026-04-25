import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..", "..");
const rootDir = path.resolve(serverDir, "..");

function deriveOverlayRevocationUrl(registrationUrl) {
  const candidate = String(registrationUrl || "").trim();
  if (!candidate) {
    return "";
  }

  if (candidate.endsWith("/register")) {
    return candidate.replace(/\/register$/, "/revoke");
  }

  return "";
}

const candidatePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "..", ".env"),
  path.resolve(rootDir, ".env")
];

for (const envPath of candidatePaths) {
  dotenv.config({ path: envPath, override: false });
}

export const env = {
  rootDir,
  serverDir,
  clientDistDir: path.resolve(rootDir, "client", "dist"),
  uploadsDir: path.resolve(rootDir, "server", "uploads"),
  sqlitePath: path.resolve(rootDir, process.env.SQLITE_PATH || "server/data/app.db"),
  port: Number(process.env.PORT || 3001),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  publicOverlayBaseUrl: process.env.PUBLIC_OVERLAY_BASE_URL || "",
  overlayRegistrationUrl: process.env.OVERLAY_REGISTRATION_URL || "",
  overlayRevocationUrl: process.env.OVERLAY_REVOCATION_URL || deriveOverlayRevocationUrl(process.env.OVERLAY_REGISTRATION_URL || ""),
  overlayRelayUrl: process.env.OVERLAY_RELAY_URL || "",
  tiktokWsUrl: process.env.TIKTOK_WS_URL || "ws://localhost:21213/",
  uploadDir: process.env.UPLOAD_DIR || "server/uploads",
  googleCredentialsPath: (() => {
    const rawPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
    if (!rawPath) return "";
    const absolutePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(rootDir, rawPath);
    return fs.existsSync(absolutePath) ? absolutePath : "";
  })()
};
