import crypto from "crypto";
import { env } from "../config/env.js";
import {
  deleteAppInstallationRow,
  getAppInstallationRow,
  upsertAppInstallationRow
} from "./sqliteStore.js";

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
  console.info("[Overlay install] identidad recibida del servidor", {
    overlaySlug: payload?.overlaySlug || "",
    installationId: payload?.installationId || ""
  });
  return validateRemotePayload(payload);
}

async function revokeRemoteInstallationRecord(installation) {
  if (!installation || installation.identitySource !== "remote") {
    return {
      attempted: false,
      revoked: false,
      message: "No habia identidad remota previa para revocar."
    };
  }

  if (!env.overlayRevocationUrl) {
    return {
      attempted: false,
      revoked: false,
      message: "No hay endpoint de revocacion configurado."
    };
  }

  const response = await fetch(env.overlayRevocationUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client: "gilo-tiktok-chat",
      installationId: installation.installationId,
      overlaySlug: installation.overlaySlug,
      relaySecret: installation.relaySecret,
      revokedAt: new Date().toISOString()
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `No se pudo revocar la identidad remota (${response.status}).`);
  }

  console.info("[Overlay install] identidad remota revocada", {
    overlaySlug: installation.overlaySlug,
    installationId: installation.installationId
  });

  return {
    attempted: true,
    revoked: true,
    message: "La identidad remota anterior fue revocada."
  };
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

export async function regenerateInstallationRecord() {
  const previous = getAppInstallationRow(INSTALLATION_KEY);
  let revocation = {
    attempted: false,
    revoked: false,
    message: "No habia identidad anterior."
  };

  if (previous) {
    try {
      revocation = await revokeRemoteInstallationRecord(previous);
    } catch (error) {
      console.warn("[Overlay install] no se pudo revocar la identidad remota anterior.", error.message);
      revocation = {
        attempted: true,
        revoked: false,
        message: error.message
      };
    }
  }

  deleteAppInstallationRow(INSTALLATION_KEY);
  const installation = await ensureInstallationRecord();

  return {
    installation,
    revocation
  };
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
    ? `${publicBaseUrl}/${installation.overlaySlug}`
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
    revocationConfigured: Boolean(env.overlayRevocationUrl),
    relayConfigured: Boolean(env.overlayRelayUrl),
    relayConnected: Boolean(relayStatus.connected),
    relayLastError: relayStatus.lastError || "",
    relayLastConnectedAt: relayStatus.lastConnectedAt || null,
    relayLastEventSentAt: relayStatus.lastEventSentAt || null,
    relayLastEventType: relayStatus.lastEventType || ""
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
