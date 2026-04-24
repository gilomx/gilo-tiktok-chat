import { randomUUID } from "crypto";

const MESSAGE_BUFFER_LIMIT = 300;

const messageStore = [];

function cloneMessage(message) {
  return JSON.parse(JSON.stringify(message));
}

function sortByCreatedAtAsc(items) {
  return [...items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function trimStore() {
  if (messageStore.length <= MESSAGE_BUFFER_LIMIT) {
    return;
  }

  const removableIndexes = [];
  for (let index = 0; index < messageStore.length; index += 1) {
    const message = messageStore[index];
    if (["done", "removed", "muted", "skipped"].includes(message.queueStatus)) {
      removableIndexes.push(index);
    }
  }

  while (messageStore.length > MESSAGE_BUFFER_LIMIT && removableIndexes.length) {
    const index = removableIndexes.shift();
    messageStore.splice(index, 1);
    for (let i = 0; i < removableIndexes.length; i += 1) {
      if (removableIndexes[i] > index) {
        removableIndexes[i] -= 1;
      }
    }
  }

  while (messageStore.length > MESSAGE_BUFFER_LIMIT) {
    messageStore.shift();
  }
}

export function createMessage(input) {
  const now = new Date().toISOString();
  const message = {
    _id: randomUUID(),
    spokenAt: null,
    createdAt: now,
    updatedAt: now,
    ...cloneMessage(input)
  };

  messageStore.push(message);
  trimStore();
  return cloneMessage(message);
}

export function getMessageById(messageId) {
  const message = messageStore.find((item) => item._id === String(messageId || ""));
  return message ? cloneMessage(message) : null;
}

export function updateMessage(messageId, updates) {
  const index = messageStore.findIndex((item) => item._id === String(messageId || ""));
  if (index === -1) {
    return null;
  }

  messageStore[index] = {
    ...messageStore[index],
    ...cloneMessage(updates),
    updatedAt: new Date().toISOString()
  };
  return cloneMessage(messageStore[index]);
}

export function updateMessages(predicate, updates) {
  let updatedCount = 0;
  for (let index = 0; index < messageStore.length; index += 1) {
    if (!predicate(messageStore[index])) {
      continue;
    }

    messageStore[index] = {
      ...messageStore[index],
      ...cloneMessage(updates),
      updatedAt: new Date().toISOString()
    };
    updatedCount += 1;
  }
  return updatedCount;
}

export function listMessages(predicate = () => true) {
  return messageStore.filter(predicate).map(cloneMessage);
}

export function findFirstMessage(predicate, sorter = sortByCreatedAtAsc) {
  const items = sorter(messageStore.filter(predicate));
  return items.length ? cloneMessage(items[0]) : null;
}

export function findDuplicateQueuedMessage(uniqueId, originalMessage) {
  return findFirstMessage(
    (message) =>
      message.queueStatus === "queued" &&
      message.sender?.uniqueId === uniqueId &&
      message.originalMessage === originalMessage
  );
}

export function getRecentMessages(limit = 10) {
  return messageStore
    .filter((message) => message.queueStatus !== "removed")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .reverse()
    .map(cloneMessage);
}
