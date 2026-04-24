import WebSocket from "ws";
import { env } from "../config/env.js";
import { compactSpaces } from "../utils/text.js";
import { emitAppEvent } from "./socketHub.js";
import { updateLiveStats } from "./liveStatsService.js";
import { createMessage, findDuplicateQueuedMessage } from "./messageStoreService.js";
import { isUserMuted, rememberLiveUser } from "./liveUsersService.js";
import { moderateIncomingMessage } from "./moderationService.js";
import { getQueueSnapshot } from "./queueService.js";
import { getReaderConfig } from "./readerConfigService.js";

let socket = null;
const USERNAME_EMOJI_REGEX = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

function sanitizeSpeakerName(value) {
  return compactSpaces(String(value || "").replace(USERNAME_EMOJI_REGEX, " ")).trim();
}

function buildReadableTtsMessage(sender, ttsMessage, readerConfig) {
  const baseMessage = String(ttsMessage || "").trim();
  if (!baseMessage) {
    return "";
  }

  if (!readerConfig.includeUserName) {
    return baseMessage;
  }

  const speakerName = sanitizeSpeakerName(sender?.nickname || sender?.uniqueId || "");
  return speakerName ? `${speakerName} dice: ${baseMessage}` : baseMessage;
}

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function pickUser(data = {}) {
  const directUser = data?.data || {};
  const nestedUser = data.user || data?.data?.user || {};
  const user = Object.keys(directUser).length ? directUser : nestedUser;
  const profilePictureUrl = firstDefined(
    data?.profilePictureUrl,
    directUser.profilePictureUrl,
    user.profilePictureUrl,
    user.profilePicture?.urlList?.[0],
    user.avatarThumb?.urlList?.[0],
    user.avatarMedium?.urlList?.[0],
    user.avatarLarge?.urlList?.[0],
    user.avatarLarger?.urlList?.[0],
    user.profilePicture?.urls?.[0],
    user.avatarThumb?.urls?.[0]
  );
  const uniqueId = firstDefined(
    data?.uniqueId,
    directUser.uniqueId,
    user.uniqueId,
    user.unique_id,
    user.secUid,
    user.sec_uid,
    user.username,
    user.displayId
  );
  const nickname = firstDefined(
    data?.nickname,
    directUser.nickname,
    user.nickname,
    user.nickName,
    user.displayName,
    user.name,
    uniqueId
  );

  return {
    userId: String(firstDefined(data?.userId, directUser.userId, user.userId, user.user_id, user.id, user.uid) || ""),
    uniqueId: uniqueId || "",
    nickname: nickname || "",
    profilePictureUrl: profilePictureUrl || "",
    isModerator: Boolean(
      firstDefined(
        data?.isModerator,
        data?.userIdentity?.isModeratorOfAnchor,
        directUser.isModerator,
        directUser?.userIdentity?.isModeratorOfAnchor,
        user.isModerator,
        user.is_moderator
      )
    )
  };
}

function extractEventPayload(raw) {
  if (raw?.event && raw?.data) {
    return { event: raw.event, payload: raw.data };
  }

  if (raw?.type && raw?.comment) {
    return { event: raw.type, payload: raw };
  }

  return { event: raw?.event || raw?.type || "unknown", payload: raw };
}

async function handleChatMessage(rawEvent) {
  const { event, payload } = extractEventPayload(rawEvent);
  if (event !== "chat") {
    return;
  }

  const rawComment = payload.comment || payload?.data?.comment || "";
  const emotes = payload?.emotes || payload?.data?.emotes || [];
  const hasEmotes = Array.isArray(emotes) && emotes.length > 0;
  if (!rawComment.trim() && !hasEmotes) {
    return;
  }

  const comment = rawComment || " ";
  const readerConfig = await getReaderConfig();

  const moderation = await moderateIncomingMessage(comment, emotes, {
    blockWeirdChars: readerConfig.blockWeirdChars,
    reduceEmojiSpam: readerConfig.reduceEmojiSpam
  });
  const sender = pickUser(payload);
  const readableTtsMessage = buildReadableTtsMessage(sender, moderation.ttsMessage, readerConfig);
  await rememberLiveUser(sender);
  const muted = await isUserMuted(sender.uniqueId);

  let queueStatus = muted ? "muted" : "queued";
  const hasReadableTtsContent = Boolean(readableTtsMessage);

  if (!muted && !hasReadableTtsContent) {
    queueStatus = "skipped";
  }

  if (!muted && queueStatus === "queued" && readerConfig.modsOnly && !sender.isModerator) {
    queueStatus = "skipped";
  }

  if (!muted && queueStatus === "queued" && readerConfig.noSpam) {
    const duplicateQueuedMessage = findDuplicateQueuedMessage(sender.uniqueId, comment);

    if (duplicateQueuedMessage) {
      queueStatus = "skipped";
    }
  }

  const message = createMessage({
    sourceEvent: event,
    sender,
    originalMessage: comment,
    filteredMessage: moderation.filteredMessage,
    ttsMessage: readableTtsMessage,
    renderedSegments: moderation.renderedSegments,
    flags: moderation.flags,
    rawEvent,
    queueStatus
  });

  emitAppEvent("message:new", message);
  emitAppEvent("queue:updated", await getQueueSnapshot());
}

function handleRoomUserEvent(rawEvent) {
  const { event, payload } = extractEventPayload(rawEvent);
  if (event !== "roomUser") {
    return;
  }

  const viewerCount = Number(
    payload?.viewerCount ??
    payload?.roomUserCount ??
    payload?.data?.viewerCount ??
    0
  );

  updateLiveStats({ viewerCount: Number.isFinite(viewerCount) ? viewerCount : 0 });
}

async function handlePresenceEvent(rawEvent) {
  const { event, payload } = extractEventPayload(rawEvent);
  if (!["member", "chat"].includes(event)) {
    return;
  }

  const sender = pickUser(payload);
  await rememberLiveUser(sender);
}

export function connectTikTokSource() {
  socket = new WebSocket(env.tiktokWsUrl);

  socket.on("open", () => {
    console.info(`Fuente TikTok conectada: ${env.tiktokWsUrl}`);
  });

  socket.on("message", async (rawBuffer) => {
    try {
      const raw = JSON.parse(String(rawBuffer));
      handleRoomUserEvent(raw);
      await handlePresenceEvent(raw);
      await handleChatMessage(raw);
    } catch (error) {
      console.error("Error procesando evento TikTok", error.message);
    }
  });

  socket.on("close", () => {
    console.warn("Fuente TikTok desconectada. Reintentando en 5s...");
    setTimeout(connectTikTokSource, 5000);
  });

  socket.on("error", (error) => {
    console.error("Error en WebSocket TikTok", error.message);
  });
}
