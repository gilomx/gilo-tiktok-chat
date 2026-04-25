import crypto from "crypto";
import { env } from "../config/env.js";
import { getAppInstallationRow, upsertAppInstallationRow } from "./sqliteStore.js";

const INSTALLATION_KEY = "main";

function normalizeBaseUrl(value) {
  const candidate = String(value || "").trim();
  if (!candidate) {
    return "";
  }

  return candidate.replace(/\/+$/, "");
}

function normalizeIdentitySource(value) {
  return value === "remote" ? "remote" : "local";
}

function createInstallationId() {
  return crypto.randomUUID();
}

function createOverlaySlug() {
  return crypto.randomBytes(16).toString("hex");
}

function createRelaySecret() {
  return crypto.randomBytes(24).toString("hex");
}

function validateRemotePayload(payload) {
  const installationId = String(payload?.installationId || "").trim();
  const overlaySlug = String(payload?.overlaySlug || "").trim();
  const relaySecret = String(payload?.relaySecret || "").trim();

  if (!installationId || !overlaySlug || !relaySecret) {
    throw new Error("El servidor no devolvio installationId, overlaySlug y relaySecret validos.");
  }

  return {
    key: INSTALLATION_KEY,
    installationId,
    overlaySlug,
    relaySecret,
    identitySource: "remote"
  };
}

async function requestRemoteInstallationRecord() {
  const response = await fetch(env.overlayRegistrationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client: "gilo-tiktok-chat",
      requestedAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `No se pudo provisionar la identidad remota (${response.status}).`);
  }

  const payload = await response.json();
  return validateRemotePayload(payload);
}

function createLocalInstallationRecord() {
  return {
    key: INSTALLATION_KEY,
    installationId: createInstallationId(),
    overlaySlug: createOverlaySlug(),
    relaySecret: createRelaySecret(),
    identitySource: "local"
  };
}

export async function ensureInstallationRecord() {
  const existing = getAppInstallationRow(INSTALLATION_KEY);
  if (existing) {
    return {
      ...existing,
      identitySource: normalizeIdentitySource(existing.identitySource)
    };
  }

  if (env.overlayRegistrationUrl) {
    const remoteRecord = await requestRemoteInstallationRecord();
    return upsertAppInstallationRow(remoteRecord);
  }

  console.warn("OVERLAY_REGISTRATION_URL no esta configurado. Se generara una identidad local de respaldo.");
  return upsertAppInstallationRow(createLocalInstallationRecord());
}

export function getInstallationRecord() {
  const installation = getAppInstallationRow(INSTALLATION_KEY);

  if (!installation) {
    throw new Error("La identidad de la instalacion aun no ha sido provisionada.");
  }

  return {
    ...installation,
    identitySource: normalizeIdentitySource(installation.identitySource)
  };
}

export function getInstallationPublicInfo(relayStatus = {}) {
  const installation = getInstallationRecord();
  const publicBaseUrl = normalizeBaseUrl(env.publicOverlayBaseUrl);
  const localPath = `/overlay/${installation.overlaySlug}`;
  const publicUrl = publicBaseUrl
    ? `${publicBaseUrl}/overlay/${installation.overlaySlug}`
    : "";

  return {
    installationId: installation.installationId,
    overlaySlug: installation.overlaySlug,
    identitySource: installation.identitySource,
    localPath,
    publicUrl,
    preferredUrl: publicUrl || localPath,
    publicBaseUrlConfigured: Boolean(publicBaseUrl),
    registrationConfigured: Boolean(env.overlayRegistrationUrl),
    relayConfigured: Boolean(env.overlayRelayUrl),
    relayConnected: Boolean(relayStatus.connected),
    relayLastError: relayStatus.lastError || "",
    relayLastConnectedAt: relayStatus.lastConnectedAt || null
  };
}

export function getInstallationRelayCredentials() {
  const installation = getInstallationRecord();

  return {
    installationId: installation.installationId,
    overlaySlug: installation.overlaySlug,
    relaySecret: installation.relaySecret
  };
}
