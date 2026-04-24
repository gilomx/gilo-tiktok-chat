import fs from "fs";
import path from "path";
import { env } from "../config/env.js";

const storedCredentialsPath = path.resolve(env.rootDir, "server", "data", "google-service-account.json");

function isValidServiceAccountJson(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    value.type === "service_account" &&
    typeof value.client_email === "string" &&
    typeof value.private_key === "string"
  );
}

export function getGoogleCredentialsPath() {
  if (env.googleCredentialsPath && fs.existsSync(env.googleCredentialsPath)) {
    return env.googleCredentialsPath;
  }

  if (fs.existsSync(storedCredentialsPath)) {
    return storedCredentialsPath;
  }

  return "";
}

export function hasGoogleCredentials() {
  return Boolean(getGoogleCredentialsPath());
}

export function saveGoogleCredentialsFile(buffer) {
  const raw = buffer.toString("utf8");
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const error = new Error("El archivo de Google no contiene un JSON valido.");
    error.statusCode = 400;
    throw error;
  }

  if (!isValidServiceAccountJson(parsed)) {
    const error = new Error("El archivo no parece ser una credencial valida de Service Account.");
    error.statusCode = 400;
    throw error;
  }

  fs.mkdirSync(path.dirname(storedCredentialsPath), { recursive: true });
  fs.writeFileSync(storedCredentialsPath, JSON.stringify(parsed, null, 2), "utf8");

  return {
    path: storedCredentialsPath,
    clientEmail: parsed.client_email,
    projectId: parsed.project_id || ""
  };
}
