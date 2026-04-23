import { Message } from "../models/Message.js";
import { QueueState } from "../models/QueueState.js";
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
  await Message.updateMany(
    {
      queueStatus: "speaking",
      updatedAt: { $lt: staleThreshold }
    },
    { queueStatus: "queued" }
  );
}

export async function getQueueSnapshot() {
  await releaseStaleSpeakingMessages();
  const state = await ensureQueueState();
  const [current, queued] = await Promise.all([
    Message.findOne({ queueStatus: "speaking" }).sort({ createdAt: 1 }).lean(),
    Message.find({ queueStatus: "queued" }).sort({ createdAt: 1 }).limit(50).lean()
  ]);

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
    await Message.updateMany(
      { queueStatus: "speaking" },
      { queueStatus: "queued" }
    );
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

  const speaking = await Message.findOne({ queueStatus: "speaking" }).sort({ createdAt: 1 });
  if (speaking) {
    return speaking;
  }

  const nextMessage = await Message.findOneAndUpdate(
    { queueStatus: "queued" },
    { queueStatus: "speaking" },
    { sort: { createdAt: 1 }, new: true }
  );

  if (nextMessage) {
    emitAppEvent("queue:updated", await getQueueSnapshot());
  }

  return nextMessage;
}

export async function completeCurrentMessage(messageId) {
  const message = await Message.findByIdAndUpdate(
    messageId,
    { queueStatus: "done", spokenAt: new Date() },
    { new: true }
  );
  emitAppEvent("queue:updated", await getQueueSnapshot());
  return message;
}

export async function removeQueuedMessage(messageId) {
  const message = await Message.findOneAndUpdate(
    { _id: messageId, queueStatus: "queued" },
    { queueStatus: "removed" },
    { new: true }
  );
  emitAppEvent("queue:updated", await getQueueSnapshot());
  return message;
}

export async function clearQueuedMessages() {
  await Message.updateMany(
    { queueStatus: { $in: ["queued", "speaking"] } },
    { queueStatus: "removed" }
  );
  const snapshot = await getQueueSnapshot();
  emitAppEvent("queue:updated", snapshot);
  return snapshot;
}
