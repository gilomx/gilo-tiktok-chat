import WebSocket from "ws";
import { env } from "../config/env.js";
import { getInstallationPublicInfo, getInstallationRelayCredentials } from "./appInstallationService.js";
import { getOverlaySnapshot } from "./overlaySnapshotService.js";
import { emitUiEvent, onAppEvent } from "./socketHub.js";

const RECONNECT_DELAY_MS = 5000;

let relaySocket = null;
let relayListenerCleanup = null;
let reconnectTimer = null;
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
