import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "./env.js";

const dbDir = path.dirname(env.sqlitePath);
fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(env.sqlitePath);

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => column.name === columnName);
}

function ensureColumn(tableName, columnName, definition) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function runSchema() {
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS forbidden_words (
      id TEXT PRIMARY KEY,
      value TEXT NOT NULL UNIQUE,
      normalizedValue TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_forbidden_words_normalizedValue
    ON forbidden_words (normalizedValue);

    CREATE TABLE IF NOT EXISTS replacement_rules (
      id TEXT PRIMARY KEY,
      "from" TEXT NOT NULL UNIQUE,
      normalizedFrom TEXT NOT NULL,
      "to" TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_replacement_rules_normalizedFrom
    ON replacement_rules (normalizedFrom);

    CREATE TABLE IF NOT EXISTS stickers (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL UNIQUE,
      normalizedKeyword TEXT NOT NULL,
      label TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileUrl TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      ttsLabel TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_stickers_normalizedKeyword
    ON stickers (normalizedKeyword);

    CREATE TABLE IF NOT EXISTS muted_users (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL DEFAULT '',
      uniqueId TEXT NOT NULL UNIQUE,
      normalizedUniqueId TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      normalizedNickname TEXT NOT NULL DEFAULT '',
      profilePictureUrl TEXT NOT NULL DEFAULT '',
      muted INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_muted_users_normalizedUniqueId
    ON muted_users (normalizedUniqueId);

    CREATE INDEX IF NOT EXISTS idx_muted_users_normalizedNickname
    ON muted_users (normalizedNickname);

    CREATE TABLE IF NOT EXISTS reader_config (
      key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      languageCode TEXT NOT NULL DEFAULT 'es-US',
      voiceName TEXT NOT NULL DEFAULT 'es-US-Standard-A',
      speakingRate REAL NOT NULL DEFAULT 1,
      pitch REAL NOT NULL DEFAULT 0,
      volumeGainDb REAL NOT NULL DEFAULT 0,
      modsOnly INTEGER NOT NULL DEFAULT 0,
      followersOnly INTEGER NOT NULL DEFAULT 0,
      includeUserName INTEGER NOT NULL DEFAULT 1,
      noSpam INTEGER NOT NULL DEFAULT 1,
      blockWeirdChars INTEGER NOT NULL DEFAULT 1,
      reduceEmojiSpam INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS overlay_config (
      key TEXT PRIMARY KEY,
      bubbleBaseColor TEXT NOT NULL DEFAULT '#8c00ff',
      modBadgeColor TEXT NOT NULL DEFAULT '#ff6e8a',
      nameTextColor TEXT NOT NULL DEFAULT '#ffffff',
      handleTextColor TEXT NOT NULL DEFAULT '#ffffff',
      messageTextColor TEXT NOT NULL DEFAULT '#ffffff',
      nameFontSizeRem REAL NOT NULL DEFAULT 0.9,
      handleFontSizeRem REAL NOT NULL DEFAULT 0.74,
      messageFontSizeRem REAL NOT NULL DEFAULT 0.84,
      stickerSizePx REAL NOT NULL DEFAULT 63,
      bubbleOpacity REAL NOT NULL DEFAULT 0.98,
      perspectiveEnabled INTEGER NOT NULL DEFAULT 0,
      perspectiveDepth REAL NOT NULL DEFAULT 900,
      perspectiveRotateX REAL NOT NULL DEFAULT 0,
      perspectiveRotateY REAL NOT NULL DEFAULT 0,
      perspectiveEyeLevel REAL NOT NULL DEFAULT 50,
      softTopFade INTEGER NOT NULL DEFAULT 1,
      fixedBubbleWidth INTEGER NOT NULL DEFAULT 0,
      alignment TEXT NOT NULL DEFAULT 'right',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queue_state (
      key TEXT PRIMARY KEY,
      paused INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  ensureColumn("reader_config", "includeUserName", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("reader_config", "followersOnly", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("overlay_config", "nameTextColor", "TEXT NOT NULL DEFAULT '#ffffff'");
  ensureColumn("overlay_config", "handleTextColor", "TEXT NOT NULL DEFAULT '#ffffff'");
  ensureColumn("overlay_config", "messageTextColor", "TEXT NOT NULL DEFAULT '#ffffff'");
  ensureColumn("overlay_config", "nameFontSizeRem", "REAL NOT NULL DEFAULT 0.9");
  ensureColumn("overlay_config", "handleFontSizeRem", "REAL NOT NULL DEFAULT 0.74");
  ensureColumn("overlay_config", "messageFontSizeRem", "REAL NOT NULL DEFAULT 0.84");
  ensureColumn("overlay_config", "stickerSizePx", "REAL NOT NULL DEFAULT 63");
  ensureColumn("overlay_config", "perspectiveEnabled", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("overlay_config", "perspectiveDepth", "REAL NOT NULL DEFAULT 900");
  ensureColumn("overlay_config", "perspectiveRotateX", "REAL NOT NULL DEFAULT 0");
  ensureColumn("overlay_config", "perspectiveRotateY", "REAL NOT NULL DEFAULT 0");
  ensureColumn("overlay_config", "perspectiveEyeLevel", "REAL NOT NULL DEFAULT 50");
}

runSchema();

export async function connectDb() {
  console.info(`SQLite listo en ${env.sqlitePath}`);
}
