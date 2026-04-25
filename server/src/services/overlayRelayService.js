import WebSocket from "ws";
import { env } from "../config/env.js";
import {
  getInstallationPublicInfo,
  getInstallationRelayCredentials,
  regenerateInstallationRecord
} from "./appInstallationService.js";
import { getOverlaySnapshot } from "./overlaySnapshotService.js";
import { emitUiEvent, onAppEvent } from "./socketHub.js";

const RECONNECT_DELAY_MS = 5000;

let relaySocket = null;
let relayListenerCleanup = null;
let reconnectTimer = null;
let repairPromise = null;
let relayStatus = {
  configured: Boolean(env.overlayRelayUrl),
  connected: false,
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  lastError: "",
  lastEventSentAt: null,
  lastEventType: ""
};

function broadcastRelayStatus() {
  emitUiEvent("overlay:relay-status", getInstallationPublicInfo(relayStatus));
}

function clearReconnectTimer() {
  if (!reconnectTimer) {
    return;
  }

  clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function teardownRelaySocket() {
  clearReconnectTimer();

  if (!relaySocket) {
    relayStatus = {
      ...relayStatus,
      connected: false
    };
    broadcastRelayStatus();
    return;
  }

  try {
    relaySocket.removeAllListeners();
    relaySocket.close();
    relaySocket.terminate();
  } catch {
    // Ignorar errores de cierre manual.
  }

  relaySocket = null;
  relayStatus = {
    ...relayStatus,
    connected: false,
    lastDisconnectedAt: new Date().toISOString()
  };
  broadcastRelayStatus();
}

function safeJsonSend(payload) {
  if (!relaySocket || relaySocket.readyState !== WebSocket.OPEN) {
    return false;
  }

  relaySocket.send(JSON.stringify(payload));
  relayStatus = {
    ...relayStatus,
    lastEventSentAt: new Date().toISOString(),
    lastEventType: String(payload?.type || ""),
    lastError: ""
  };

  console.info("[Overlay relay] enviado", {
    type: payload?.type || "unknown",
    overlaySlug: payload?.payload?.overlaySlug || "",
    emittedAt: relayStatus.lastEventSentAt
  });
  broadcastRelayStatus();
  return true;
}

function scheduleReconnect() {
  if (reconnectTimer || !env.overlayRelayUrl) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectOverlayRelay();
  }, RECONNECT_DELAY_MS);
}

function containsInvalidIdentityHint(value) {
  const normalized = String(value || "").toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    "invalid installation",
    "installation not found",
    "unknown installation",
    "invalid identity",
    "identity not found",
    "unknown identity",
    "invalid overlay",
    "overlay not found",
    "unknown overlay",
    "invalid slug",
    "unknown slug",
    "invalid relay secret",
    "relay secret mismatch",
    "installation_invalid",
    "installation_not_found",
    "identity_invalid",
    "identity_not_found",
    "overlay_not_found",
    "slug_not_found",
    "unknown_installation",
    "unknown_identity",
    "unknown_overlay"
  ].some((hint) => normalized.includes(hint));
}

function isInvalidInstallationMessage(message) {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidateValues = [
    message.type,
    message.code,
    message.reason,
    message.error,
    message.message,
    message?.payload?.code,
    message?.payload?.reason,
    message?.payload?.error,
    message?.payload?.message
  ];

  return candidateValues.some(containsInvalidIdentityHint);
}

async function autoRepairInstallation(trigger = "unknown") {
  if (repairPromise) {
    return repairPromise;
  }

  repairPromise = (async () => {
    try {
      console.warn(`[Overlay relay] identidad invalida detectada (${trigger}). Regenerando instalacion...`);
      teardownRelaySocket();
      await regenerateInstallationRecord();
      relayStatus = {
        ...relayStatus,
        lastError: ""
      };
      broadcastRelayStatus();
      connectOverlayRelay();
    } catch (error) {
      relayStatus = {
        ...relayStatus,
        lastError: error.message || "No se pudo regenerar la instalacion del overlay."
      };
      broadcastRelayStatus();
      console.error("[Overlay relay] no se pudo autoreparar la instalacion.", error);
      scheduleReconnect();
    } finally {
      repairPromise = null;
    }
  })();

  return repairPromise;
}

async function sendRegistration() {
  const credentials = getInstallationRelayCredentials();
  const publicInfo = getInstallationPublicInfo(relayStatus);

  safeJsonSend({
    type: "overlay.register",
    payload: {
      ...credentials,
      publicUrl: publicInfo.publicUrl,
      connectedAt: new Date().toISOString()
    }
  });
}

async function sendSnapshot(reason = "sync") {
  const credentials = getInstallationRelayCredentials();

  safeJsonSend({
    type: "overlay.snapshot",
    payload: {
      overlaySlug: credentials.overlaySlug,
      installationId: credentials.installationId,
      reason,
      snapshot: await getOverlaySnapshot()
    }
  });
}

function bindRelayEvents() {
  if (relayListenerCleanup) {
    return;
  }

  relayListenerCleanup = onAppEvent((event, payload) => {
    if (!relayStatus.connected) {
      return;
    }

    const credentials = getInstallationRelayCredentials();
    safeJsonSend({
      type: "overlay.event",
      payload: {
        overlaySlug: credentials.overlaySlug,
        installationId: credentials.installationId,
        event,
        eventPayload: payload,
        emittedAt: new Date().toISOString()
      }
    });
  });
}

export function getOverlayRelayStatus() {
  return {
    ...relayStatus
  };
}

export function restartOverlayRelay() {
  teardownRelaySocket();
  connectOverlayRelay();
}

export function connectOverlayRelay() {
  bindRelayEvents();

  if (!env.overlayRelayUrl) {
    broadcastRelayStatus();
    return;
  }

  if (
    relaySocket &&
    (relaySocket.readyState === WebSocket.OPEN || relaySocket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  relaySocket = new WebSocket(env.overlayRelayUrl);

  relaySocket.on("open", async () => {
    relayStatus = {
      ...relayStatus,
      configured: true,
      connected: true,
      lastConnectedAt: new Date().toISOString(),
      lastError: ""
    };
    broadcastRelayStatus();

    await sendRegistration();
    await sendSnapshot("connected");
    console.info(`Relay overlay conectado: ${env.overlayRelayUrl}`);
  });

  relaySocket.on("message", async (rawBuffer) => {
    try {
      const message = JSON.parse(String(rawBuffer));

      if (isInvalidInstallationMessage(message)) {
        await autoRepairInstallation(String(message?.type || message?.code || message?.reason || "server-message"));
        return;
      }

      if (message?.type === "overlay.snapshot:request") {
        await sendSnapshot("requested");
      }

      if (message?.type === "overlay.ping") {
        safeJsonSend({
          type: "overlay.pong",
          payload: {
            emittedAt: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.warn("No se pudo interpretar el mensaje del relay overlay.", error.message);
    }
  });

  relaySocket.on("close", () => {
    relayStatus = {
      ...relayStatus,
      connected: false,
      lastDisconnectedAt: new Date().toISOString()
    };
    broadcastRelayStatus();
    console.warn("Relay overlay desconectado. Reintentando en 5s...");
    scheduleReconnect();
  });

  relaySocket.on("error", (error) => {
    relayStatus = {
      ...relayStatus,
      connected: false,
      lastError: error.message || "No se pudo conectar al relay overlay."
    };
    broadcastRelayStatus();
    console.error("Error en relay overlay", error.message);
  });
}
