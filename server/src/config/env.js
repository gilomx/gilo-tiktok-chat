import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverDir = path.resolve(__dirname, "..", "..");
const rootDir = path.resolve(serverDir, "..");
const userDataDir = path.resolve(rootDir, "server", "data");
const defaultUploadsDir = path.join(userDataDir, "uploads");
const defaultManagedGoogleCredentialsPath = path.join(userDataDir, "google-service-account.json");
const legacyUploadsDir = path.resolve(rootDir, "server", "uploads");
const legacyRootCredentialsPath = path.resolve(rootDir, "credentials.json");
const DEFAULT_PUBLIC_OVERLAY_BASE_URL = "https://overlay.gilo.mx";
const DEFAULT_OVERLAY_REGISTRATION_URL = "https://overlay.gilo.mx/api/installations/register";
const DEFAULT_OVERLAY_REVOCATION_URL = "https://overlay.gilo.mx/api/installations/revoke";
const DEFAULT_OVERLAY_RELAY_URL = "wss://overlay.gilo.mx/api/overlay-relay";

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

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyDirectoryContents(sourceDir, destinationDir) {
  if (!fs.existsSync(sourceDir)) {
    return false;
  }

  ensureDir(destinationDir);
  let copiedAny = false;

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copiedAny = copyDirectoryContents(sourcePath, destinationPath) || copiedAny;
      continue;
    }

    if (!fs.existsSync(destinationPath)) {
      fs.copyFileSync(sourcePath, destinationPath);
      copiedAny = true;
    }
  }

  return copiedAny;
}

function prepareUserData() {
  ensureDir(userDataDir);
  ensureDir(defaultUploadsDir);

  const migratedUploads = copyDirectoryContents(legacyUploadsDir, defaultUploadsDir);

  if (!fs.existsSync(defaultManagedGoogleCredentialsPath) && fs.existsSync(legacyRootCredentialsPath)) {
    fs.copyFileSync(legacyRootCredentialsPath, defaultManagedGoogleCredentialsPath);
  }

  return {
    migratedUploads
  };
}

const userDataPreparation = prepareUserData();

export const env = {
  rootDir,
  serverDir,
  userDataDir,
  clientDistDir: path.resolve(rootDir, "client", "dist"),
  uploadsDir: process.env.UPLOAD_DIR
    ? path.resolve(rootDir, process.env.UPLOAD_DIR)
    : defaultUploadsDir,
  sqlitePath: process.env.SQLITE_PATH
    ? path.resolve(rootDir, process.env.SQLITE_PATH)
    : path.join(userDataDir, "app.db"),
  port: Number(process.env.PORT || 3001),
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  publicOverlayBaseUrl: process.env.PUBLIC_OVERLAY_BASE_URL || DEFAULT_PUBLIC_OVERLAY_BASE_URL,
  overlayRegistrationUrl: process.env.OVERLAY_REGISTRATION_URL || DEFAULT_OVERLAY_REGISTRATION_URL,
  overlayRevocationUrl:
    process.env.OVERLAY_REVOCATION_URL ||
    DEFAULT_OVERLAY_REVOCATION_URL ||
    deriveOverlayRevocationUrl(process.env.OVERLAY_REGISTRATION_URL || DEFAULT_OVERLAY_REGISTRATION_URL),
  overlayRelayUrl: process.env.OVERLAY_RELAY_URL || DEFAULT_OVERLAY_RELAY_URL,
  tiktokWsUrl: process.env.TIKTOK_WS_URL || "ws://localhost:21213/",
  uploadDir: process.env.UPLOAD_DIR || "",
  managedGoogleCredentialsPath: defaultManagedGoogleCredentialsPath,
  googleCredentialsPath: (() => {
    const rawPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || "";
    if (!rawPath) {
      return fs.existsSync(defaultManagedGoogleCredentialsPath) ? defaultManagedGoogleCredentialsPath : "";
    }
    const absolutePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(rootDir, rawPath);
    return fs.existsSync(absolutePath) ? absolutePath : "";
  })(),
  userDataPreparation
};
