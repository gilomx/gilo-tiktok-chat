import { QueueState } from "../models/QueueState.js";
import { buildTtsMessageFromSegments } from "./moderationService.js";
import {
  findFirstMessage,
  getMessageById,
  listMessages,
  updateMessage,
  updateMessages
} from "./messageStoreService.js";
import { emitAppEvent } from "./socketHub.js";

const STALE_SPEAKING_MS = 30 * 1000;

async function ensureQueueState() {
  let state = await QueueState.findOne({ key: "main" });
  if (!state) {
    state = await QueueState.create({ key: "main", paused: false });
  }
  return state;
}

async function releaseStaleSpeakingMessages() {
  const staleThreshold = new Date(Date.now() - STALE_SPEAKING_MS);
  updateMessages(
    (message) =>
      message.queueStatus === "speaking" &&
      new Date(message.updatedAt) < staleThreshold,
    { queueStatus: "queued" }
  );
}

export async function getQueueSnapshot() {
  await releaseStaleSpeakingMessages();
  const state = await ensureQueueState();
  const current = findFirstMessage((message) => message.queueStatus === "speaking");
  const queued = listMessages((message) => message.queueStatus === "queued")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 50);

  return {
    paused: state.paused,
    current,
    items: queued
  };
}

export async function setQueuePaused(paused) {
  const state = await ensureQueueState();
  state.paused = paused;
  await state.save();

  if (paused) {
    updateMessages((message) => message.queueStatus === "speaking", { queueStatus: "queued" });
  }

  const snapshot = await getQueueSnapshot();
  emitAppEvent("queue:updated", snapshot);
  return snapshot;
}

export async function claimNextMessage() {
  await releaseStaleSpeakingMessages();
  const state = await ensureQueueState();
  if (state.paused) {
    return null;
  }

  const speaking = findFirstMessage((message) => message.queueStatus === "speaking");
  if (speaking) {
    return speaking;
  }

  const nextQueued = findFirstMessage((message) => message.queueStatus === "queued");
  const nextMessage = nextQueued
    ? updateMessage(nextQueued._id, { queueStatus: "speaking" })
    : null;

  if (nextMessage) {
    emitAppEvent("queue:updated", await getQueueSnapshot());
  }

  return nextMessage;
}

export async function completeCurrentMessage(messageId) {
  const message = updateMessage(messageId, {
    queueStatus: "done",
    spokenAt: new Date().toISOString()
  });
  emitAppEvent("queue:updated", await getQueueSnapshot());
  return message;
}

export async function removeQueuedMessage(messageId) {
  const current = getMessageById(messageId);
  const message = current?.queueStatus === "queued"
    ? updateMessage(messageId, { queueStatus: "removed" })
    : null;
  emitAppEvent("queue:updated", await getQueueSnapshot());
  return message;
}

export async function clearQueuedMessages() {
  updateMessages(
    (message) => ["queued", "speaking"].includes(message.queueStatus),
    { queueStatus: "removed" }
  );
  const snapshot = await getQueueSnapshot();
  emitAppEvent("queue:updated", snapshot);
  return snapshot;
}

export async function removeQueuedMessagesBySender(uniqueId) {
  const normalizedUniqueId = String(uniqueId || "").trim();
  if (!normalizedUniqueId) {
    return getQueueSnapshot();
  }

  updateMessages(
    (message) =>
      message.sender?.uniqueId === normalizedUniqueId &&
      message.queueStatus === "queued",
    { queueStatus: "removed" }
  );

  const snapshot = await getQueueSnapshot();
  emitAppEvent("queue:updated", snapshot);
  return snapshot;
}

export async function reanalyzeQueuedMessages(readerConfig = {}) {
  await releaseStaleSpeakingMessages();

  const queuedMessages = listMessages((message) => message.queueStatus === "queued")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const messagesToRemove = [];
  const seenMessages = new Set();

  for (const message of queuedMessages) {
    const nextTtsMessage = buildTtsMessageFromSegments(
      message.renderedSegments || [],
      { reduceEmojiSpam: readerConfig.reduceEmojiSpam }
    );

    if (!nextTtsMessage.trim()) {
      messagesToRemove.push(message._id);
      continue;
    }

    if (nextTtsMessage !== message.ttsMessage) {
      updateMessage(message._id, { ttsMessage: nextTtsMessage });
    }

    if (readerConfig.blockWeirdChars && message.flags?.foreignSegments?.length) {
      messagesToRemove.push(message._id);
      continue;
    }

    if (readerConfig.modsOnly && !message.sender?.isModerator) {
      messagesToRemove.push(message._id);
      continue;
    }

    if (readerConfig.noSpam) {
      const dedupeKey = `${message.sender?.uniqueId || ""}::${message.originalMessage || ""}`;
      if (seenMessages.has(dedupeKey)) {
        messagesToRemove.push(message._id);
        continue;
      }
      seenMessages.add(dedupeKey);
    }
  }

  if (messagesToRemove.length) {
    updateMessages(
      (message) => messagesToRemove.includes(message._id),
      { queueStatus: "removed" }
    );
  }

  const snapshot = await getQueueSnapshot();
  emitAppEvent("queue:updated", snapshot);
  return snapshot;
}
