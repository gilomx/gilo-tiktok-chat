import { emitAppEvent } from "./socketHub.js";
import { removeQueuedMessagesBySender } from "./queueService.js";
import { normalizeText } from "../utils/text.js";
import { getMutedUserByUniqueId, listMutedUsers, setMutedUserState, upsertMutedUser } from "./sqliteStore.js";

const MAX_USERS = 200;
let liveUsers = [];

function rankUsers(users, query) {
  const normalizedQuery = normalizeText(query);
  return users
    .map((user) => {
      const nickname = normalizeText(user.nickname || "");
      const uniqueId = normalizeText(user.uniqueId || "");
      let score = 0;

      if (!normalizedQuery) score = 1;
      else if (uniqueId === normalizedQuery || nickname === normalizedQuery) score = 100;
      else if (uniqueId.startsWith(normalizedQuery) || nickname.startsWith(normalizedQuery)) score = 75;
      else if (uniqueId.includes(normalizedQuery) || nickname.includes(normalizedQuery)) score = 50;

      return { user, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.user.lastSeenAt) - new Date(a.user.lastSeenAt))
    .map((entry) => entry.user);
}

async function attachMuteState(users) {
  const uniqueIds = users.map((user) => user.uniqueId).filter(Boolean);
  const mutedUsers = listMutedUsers().filter((item) => uniqueIds.includes(item.uniqueId));
  const mutedSet = new Set(mutedUsers.map((item) => item.uniqueId));
  return users.map((user) => ({
    ...user,
    muted: mutedSet.has(user.uniqueId)
  }));
}

export async function rememberLiveUser(sender) {
  if (!sender?.uniqueId) {
    return;
  }

  const nextUser = {
    userId: sender.userId || "",
    uniqueId: sender.uniqueId,
    nickname: sender.nickname || sender.uniqueId,
    profilePictureUrl: sender.profilePictureUrl || "",
    lastSeenAt: new Date().toISOString()
  };

  liveUsers = [
    nextUser,
    ...liveUsers.filter((user) => user.uniqueId !== nextUser.uniqueId)
  ].slice(0, MAX_USERS);

  emitAppEvent("live:users-updated", await getRecentLiveUsers());
}

export async function getRecentLiveUsers(limit = 15) {
  return attachMuteState(liveUsers.slice(0, limit));
}

export async function searchLiveUsers(query, limit = 15) {
  const ranked = rankUsers(liveUsers, query).slice(0, limit);
  return attachMuteState(ranked);
}

export async function searchMutedUsers(query, limit = 15) {
  const mutedUsers = listMutedUsers();
  const ranked = rankUsers(
    mutedUsers.map((user) => ({
      userId: user.userId || "",
      uniqueId: user.uniqueId,
      nickname: user.nickname || user.uniqueId,
      profilePictureUrl: user.profilePictureUrl || "",
      lastSeenAt: user.updatedAt || user.createdAt
    })),
    query
  ).slice(0, limit);

  return ranked.map((user) => ({ ...user, muted: true }));
}

export async function muteLiveUser(sender) {
  const uniqueId = String(sender?.uniqueId || "").trim();
  if (!uniqueId) {
    throw new Error("uniqueId es obligatorio para silenciar");
  }

  upsertMutedUser({
    userId: sender?.userId || "",
    uniqueId,
    normalizedUniqueId: normalizeText(uniqueId),
    nickname: sender?.nickname || uniqueId,
    normalizedNickname: normalizeText(sender?.nickname || uniqueId),
    profilePictureUrl: sender?.profilePictureUrl || "",
    muted: true
  });

  await removeQueuedMessagesBySender(uniqueId);

  emitAppEvent("live:users-updated", await getRecentLiveUsers());
  emitAppEvent("live:muted-users-updated", await searchMutedUsers(""));
}

export async function unmuteLiveUser(uniqueId) {
  setMutedUserState(uniqueId, false);

  emitAppEvent("live:users-updated", await getRecentLiveUsers());
  emitAppEvent("live:muted-users-updated", await searchMutedUsers(""));
}

export async function isUserMuted(uniqueId) {
  if (!uniqueId) {
    return false;
  }
  const mutedUser = getMutedUserByUniqueId(uniqueId);
  return Boolean(mutedUser);
}
