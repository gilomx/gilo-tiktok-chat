import crypto from "crypto";
import { db } from "../config/db.js";

function nowIso() {
  return new Date().toISOString();
}

function withId(row) {
  if (!row) return null;
  const { id, ...rest } = row;
  return { _id: id, ...rest };
}

function parseBoolean(value, fallback = false) {
  if (value === null || value === undefined) {
    return fallback;
  }
  return Boolean(value);
}

function toIntegerBoolean(value) {
  return value ? 1 : 0;
}

function parseConfigRow(row) {
  if (!row) return null;
  return {
    ...row,
    enabled: parseBoolean(row.enabled, true),
    modsOnly: parseBoolean(row.modsOnly, false),
    followersOnly: parseBoolean(row.followersOnly, false),
    includeUserName: parseBoolean(row.includeUserName, true),
    noSpam: parseBoolean(row.noSpam, true),
    blockWeirdChars: parseBoolean(row.blockWeirdChars, true),
    reduceEmojiSpam: parseBoolean(row.reduceEmojiSpam, true)
  };
}

function parseOverlayRow(row) {
  if (!row) return null;
  return {
    ...row,
    perspectiveEnabled: parseBoolean(row.perspectiveEnabled, false),
    softTopFade: parseBoolean(row.softTopFade, true),
    fixedBubbleWidth: parseBoolean(row.fixedBubbleWidth, false)
  };
}

function parseQueueStateRow(row) {
  if (!row) return null;
  return {
    ...row,
    paused: parseBoolean(row.paused, false)
  };
}

function parseInstallationRow(row) {
  if (!row) return null;
  return row;
}

function parseMutedUserRow(row) {
  if (!row) return null;
  return {
    ...withId(row),
    muted: parseBoolean(row.muted, true)
  };
}

const listForbiddenWordsStmt = db.prepare(`
  SELECT id, value, normalizedValue, notes, createdAt, updatedAt
  FROM forbidden_words
  ORDER BY datetime(createdAt) DESC
`);

const insertForbiddenWordStmt = db.prepare(`
  INSERT INTO forbidden_words (id, value, normalizedValue, notes, createdAt, updatedAt)
  VALUES (@id, @value, @normalizedValue, @notes, @createdAt, @updatedAt)
`);

const deleteForbiddenWordStmt = db.prepare(`DELETE FROM forbidden_words WHERE id = ?`);

const listReplacementRulesStmt = db.prepare(`
  SELECT id, "from", normalizedFrom, "to", createdAt, updatedAt
  FROM replacement_rules
  ORDER BY datetime(createdAt) DESC
`);

const insertReplacementRuleStmt = db.prepare(`
  INSERT INTO replacement_rules (id, "from", normalizedFrom, "to", createdAt, updatedAt)
  VALUES (@id, @from, @normalizedFrom, @to, @createdAt, @updatedAt)
`);

const deleteReplacementRuleStmt = db.prepare(`DELETE FROM replacement_rules WHERE id = ?`);

const listStickersStmt = db.prepare(`
  SELECT id, keyword, normalizedKeyword, label, fileName, fileUrl, mimeType, ttsLabel, createdAt, updatedAt
  FROM stickers
  ORDER BY datetime(createdAt) DESC
`);

const insertStickerStmt = db.prepare(`
  INSERT INTO stickers (id, keyword, normalizedKeyword, label, fileName, fileUrl, mimeType, ttsLabel, createdAt, updatedAt)
  VALUES (@id, @keyword, @normalizedKeyword, @label, @fileName, @fileUrl, @mimeType, @ttsLabel, @createdAt, @updatedAt)
`);

const getStickerByIdStmt = db.prepare(`
  SELECT id, keyword, normalizedKeyword, label, fileName, fileUrl, mimeType, ttsLabel, createdAt, updatedAt
  FROM stickers
  WHERE id = ?
`);

const deleteStickerStmt = db.prepare(`DELETE FROM stickers WHERE id = ?`);

const getOverlayConfigStmt = db.prepare(`
  SELECT key, bubbleBaseColor, modBadgeColor, nameTextColor, handleTextColor, messageTextColor,
         nameFontSizeRem, handleFontSizeRem, messageFontSizeRem, stickerSizePx,
         bubbleOpacity, perspectiveEnabled, perspectiveDepth, perspectiveRotateX, perspectiveRotateY, perspectiveEyeLevel,
         softTopFade, fixedBubbleWidth, alignment, createdAt, updatedAt
  FROM overlay_config
  WHERE key = ?
`);

const upsertOverlayConfigStmt = db.prepare(`
  INSERT INTO overlay_config (
    key, bubbleBaseColor, modBadgeColor, nameTextColor, handleTextColor, messageTextColor,
    nameFontSizeRem, handleFontSizeRem, messageFontSizeRem, stickerSizePx,
    bubbleOpacity, perspectiveEnabled, perspectiveDepth, perspectiveRotateX, perspectiveRotateY, perspectiveEyeLevel,
    softTopFade, fixedBubbleWidth, alignment, createdAt, updatedAt
  ) VALUES (
    @key, @bubbleBaseColor, @modBadgeColor, @nameTextColor, @handleTextColor, @messageTextColor,
    @nameFontSizeRem, @handleFontSizeRem, @messageFontSizeRem, @stickerSizePx,
    @bubbleOpacity, @perspectiveEnabled, @perspectiveDepth, @perspectiveRotateX, @perspectiveRotateY, @perspectiveEyeLevel,
    @softTopFade, @fixedBubbleWidth, @alignment, @createdAt, @updatedAt
  )
  ON CONFLICT(key) DO UPDATE SET
    bubbleBaseColor = excluded.bubbleBaseColor,
    modBadgeColor = excluded.modBadgeColor,
    nameTextColor = excluded.nameTextColor,
    handleTextColor = excluded.handleTextColor,
    messageTextColor = excluded.messageTextColor,
    nameFontSizeRem = excluded.nameFontSizeRem,
    handleFontSizeRem = excluded.handleFontSizeRem,
    messageFontSizeRem = excluded.messageFontSizeRem,
    stickerSizePx = excluded.stickerSizePx,
    bubbleOpacity = excluded.bubbleOpacity,
    perspectiveEnabled = excluded.perspectiveEnabled,
    perspectiveDepth = excluded.perspectiveDepth,
    perspectiveRotateX = excluded.perspectiveRotateX,
    perspectiveRotateY = excluded.perspectiveRotateY,
    perspectiveEyeLevel = excluded.perspectiveEyeLevel,
    softTopFade = excluded.softTopFade,
    fixedBubbleWidth = excluded.fixedBubbleWidth,
    alignment = excluded.alignment,
    updatedAt = excluded.updatedAt
`);

const getReaderConfigStmt = db.prepare(`
  SELECT key, enabled, languageCode, voiceName, speakingRate, pitch, volumeGainDb,
         modsOnly, followersOnly, includeUserName, noSpam, blockWeirdChars, reduceEmojiSpam, createdAt, updatedAt
  FROM reader_config
  WHERE key = ?
`);

const upsertReaderConfigStmt = db.prepare(`
  INSERT INTO reader_config (
    key, enabled, languageCode, voiceName, speakingRate, pitch, volumeGainDb,
    modsOnly, followersOnly, includeUserName, noSpam, blockWeirdChars, reduceEmojiSpam, createdAt, updatedAt
  ) VALUES (
    @key, @enabled, @languageCode, @voiceName, @speakingRate, @pitch, @volumeGainDb,
    @modsOnly, @followersOnly, @includeUserName, @noSpam, @blockWeirdChars, @reduceEmojiSpam, @createdAt, @updatedAt
  )
  ON CONFLICT(key) DO UPDATE SET
    enabled = excluded.enabled,
    languageCode = excluded.languageCode,
    voiceName = excluded.voiceName,
    speakingRate = excluded.speakingRate,
    pitch = excluded.pitch,
    volumeGainDb = excluded.volumeGainDb,
    modsOnly = excluded.modsOnly,
    followersOnly = excluded.followersOnly,
    includeUserName = excluded.includeUserName,
    noSpam = excluded.noSpam,
    blockWeirdChars = excluded.blockWeirdChars,
    reduceEmojiSpam = excluded.reduceEmojiSpam,
    updatedAt = excluded.updatedAt
`);

const getQueueStateStmt = db.prepare(`
  SELECT key, paused, createdAt, updatedAt
  FROM queue_state
  WHERE key = ?
`);

const getAppInstallationStmt = db.prepare(`
  SELECT key, installationId, overlaySlug, relaySecret, identitySource, createdAt, updatedAt
  FROM app_installation
  WHERE key = ?
`);

const deleteAppInstallationStmt = db.prepare(`
  DELETE FROM app_installation
  WHERE key = ?
`);

const upsertQueueStateStmt = db.prepare(`
  INSERT INTO queue_state (key, paused, createdAt, updatedAt)
  VALUES (@key, @paused, @createdAt, @updatedAt)
  ON CONFLICT(key) DO UPDATE SET
    paused = excluded.paused,
    updatedAt = excluded.updatedAt
`);

const upsertAppInstallationStmt = db.prepare(`
  INSERT INTO app_installation (key, installationId, overlaySlug, relaySecret, identitySource, createdAt, updatedAt)
  VALUES (@key, @installationId, @overlaySlug, @relaySecret, @identitySource, @createdAt, @updatedAt)
  ON CONFLICT(key) DO UPDATE SET
    installationId = excluded.installationId,
    overlaySlug = excluded.overlaySlug,
    relaySecret = excluded.relaySecret,
    identitySource = excluded.identitySource,
    updatedAt = excluded.updatedAt
`);

const getMutedUsersStmt = db.prepare(`
  SELECT id, userId, uniqueId, normalizedUniqueId, nickname, normalizedNickname,
         profilePictureUrl, muted, createdAt, updatedAt
  FROM muted_users
  WHERE muted = 1
  ORDER BY datetime(updatedAt) DESC
`);

const getMutedUserByUniqueIdStmt = db.prepare(`
  SELECT id, userId, uniqueId, normalizedUniqueId, nickname, normalizedNickname,
         profilePictureUrl, muted, createdAt, updatedAt
  FROM muted_users
  WHERE uniqueId = ?
`);

const getMutedUserByUserIdStmt = db.prepare(`
  SELECT id, userId, uniqueId, normalizedUniqueId, nickname, normalizedNickname,
         profilePictureUrl, muted, createdAt, updatedAt
  FROM muted_users
  WHERE userId = ?
  ORDER BY datetime(updatedAt) DESC
  LIMIT 1
`);

const upsertMutedUserStmt = db.prepare(`
  INSERT INTO muted_users (
    id, userId, uniqueId, normalizedUniqueId, nickname, normalizedNickname,
    profilePictureUrl, muted, createdAt, updatedAt
  ) VALUES (
    @id, @userId, @uniqueId, @normalizedUniqueId, @nickname, @normalizedNickname,
    @profilePictureUrl, @muted, @createdAt, @updatedAt
  )
  ON CONFLICT(uniqueId) DO UPDATE SET
    userId = excluded.userId,
    normalizedUniqueId = excluded.normalizedUniqueId,
    nickname = excluded.nickname,
    normalizedNickname = excluded.normalizedNickname,
    profilePictureUrl = excluded.profilePictureUrl,
    muted = excluded.muted,
    updatedAt = excluded.updatedAt
`);

const setMutedUserStateStmt = db.prepare(`
  UPDATE muted_users
  SET muted = ?, updatedAt = ?
  WHERE uniqueId = ?
`);

const setMutedUserStateByUserIdStmt = db.prepare(`
  UPDATE muted_users
  SET muted = ?, updatedAt = ?
  WHERE userId = ?
`);

const updateMutedUserByIdStmt = db.prepare(`
  UPDATE muted_users
  SET userId = @userId,
      uniqueId = @uniqueId,
      normalizedUniqueId = @normalizedUniqueId,
      nickname = @nickname,
      normalizedNickname = @normalizedNickname,
      profilePictureUrl = @profilePictureUrl,
      muted = @muted,
      updatedAt = @updatedAt
  WHERE id = @id
`);

export function listForbiddenWords() {
  return listForbiddenWordsStmt.all().map(withId);
}

export function createForbiddenWord({ value, normalizedValue, notes = "" }) {
  const record = {
    id: crypto.randomUUID(),
    value,
    normalizedValue,
    notes,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  insertForbiddenWordStmt.run(record);
  return withId(record);
}

export function deleteForbiddenWord(id) {
  return deleteForbiddenWordStmt.run(id);
}

export function listReplacementRules() {
  return listReplacementRulesStmt.all().map(withId);
}

export function createReplacementRule({ from, normalizedFrom, to }) {
  const record = {
    id: crypto.randomUUID(),
    from,
    normalizedFrom,
    to,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  insertReplacementRuleStmt.run(record);
  return withId(record);
}

export function deleteReplacementRule(id) {
  return deleteReplacementRuleStmt.run(id);
}

export function listStickers() {
  return listStickersStmt.all().map(withId);
}

export function createSticker({ keyword, normalizedKeyword, label, fileName, fileUrl, mimeType, ttsLabel = "" }) {
  const record = {
    id: crypto.randomUUID(),
    keyword,
    normalizedKeyword,
    label,
    fileName,
    fileUrl,
    mimeType,
    ttsLabel,
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  insertStickerStmt.run(record);
  return withId(record);
}

export function getStickerById(id) {
  return withId(getStickerByIdStmt.get(id));
}

export function deleteSticker(id) {
  return deleteStickerStmt.run(id);
}

export function getOverlayConfigRow(key = "main") {
  return parseOverlayRow(getOverlayConfigStmt.get(key));
}

export function upsertOverlayConfigRow(payload) {
  const timestamp = nowIso();
  upsertOverlayConfigStmt.run({
    ...payload,
    perspectiveEnabled: toIntegerBoolean(payload.perspectiveEnabled),
    softTopFade: toIntegerBoolean(payload.softTopFade),
    fixedBubbleWidth: toIntegerBoolean(payload.fixedBubbleWidth),
    createdAt: payload.createdAt || timestamp,
    updatedAt: timestamp
  });
  return getOverlayConfigRow(payload.key);
}

export function getReaderConfigRow(key = "main") {
  return parseConfigRow(getReaderConfigStmt.get(key));
}

export function upsertReaderConfigRow(payload) {
  const timestamp = nowIso();
  upsertReaderConfigStmt.run({
    ...payload,
    enabled: toIntegerBoolean(payload.enabled),
    modsOnly: toIntegerBoolean(payload.modsOnly),
    followersOnly: toIntegerBoolean(payload.followersOnly),
    includeUserName: toIntegerBoolean(payload.includeUserName),
    noSpam: toIntegerBoolean(payload.noSpam),
    blockWeirdChars: toIntegerBoolean(payload.blockWeirdChars),
    reduceEmojiSpam: toIntegerBoolean(payload.reduceEmojiSpam),
    createdAt: payload.createdAt || timestamp,
    updatedAt: timestamp
  });
  return getReaderConfigRow(payload.key);
}

export function getQueueStateRow(key = "main") {
  return parseQueueStateRow(getQueueStateStmt.get(key));
}

export function upsertQueueStateRow(payload) {
  const timestamp = nowIso();
  upsertQueueStateStmt.run({
    ...payload,
    paused: toIntegerBoolean(payload.paused),
    createdAt: payload.createdAt || timestamp,
    updatedAt: timestamp
  });
  return getQueueStateRow(payload.key);
}

export function getAppInstallationRow(key = "main") {
  return parseInstallationRow(getAppInstallationStmt.get(key));
}

export function upsertAppInstallationRow(payload) {
  const existing = getAppInstallationRow(payload.key);
  const timestamp = nowIso();

  upsertAppInstallationStmt.run({
    ...payload,
    identitySource: payload.identitySource || existing?.identitySource || "local",
    createdAt: existing?.createdAt || payload.createdAt || timestamp,
    updatedAt: timestamp
  });

  return getAppInstallationRow(payload.key);
}

export function deleteAppInstallationRow(key = "main") {
  return deleteAppInstallationStmt.run(key);
}

export function listMutedUsers() {
  return getMutedUsersStmt.all().map(parseMutedUserRow);
}

export function getMutedUserByUniqueId(uniqueId) {
  return parseMutedUserRow(getMutedUserByUniqueIdStmt.get(uniqueId));
}

export function getMutedUserByUserId(userId) {
  return parseMutedUserRow(getMutedUserByUserIdStmt.get(userId));
}

export function upsertMutedUser(payload) {
  const existing = payload.userId
    ? getMutedUserByUserId(payload.userId) || getMutedUserByUniqueId(payload.uniqueId)
    : getMutedUserByUniqueId(payload.uniqueId);
  const timestamp = nowIso();
  const record = {
    id: existing?._id || crypto.randomUUID(),
    ...payload,
    muted: toIntegerBoolean(payload.muted),
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp
  };

  if (existing?._id && existing.uniqueId !== payload.uniqueId) {
    updateMutedUserByIdStmt.run(record);
  } else {
    upsertMutedUserStmt.run(record);
  }

  return getMutedUserByUserId(payload.userId) || getMutedUserByUniqueId(payload.uniqueId);
}

export function setMutedUserState(identifier, muted) {
  const userId = String(identifier?.userId || "").trim();
  const uniqueId = String(identifier?.uniqueId || identifier || "").trim();
  const timestamp = nowIso();

  if (userId) {
    setMutedUserStateByUserIdStmt.run(toIntegerBoolean(muted), timestamp, userId);
    return getMutedUserByUserId(userId) || getMutedUserByUniqueId(uniqueId);
  }

  setMutedUserStateStmt.run(toIntegerBoolean(muted), timestamp, uniqueId);
  return getMutedUserByUniqueId(uniqueId);
}
