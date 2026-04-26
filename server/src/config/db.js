import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "./env.js";

const dbDir = path.dirname(env.sqlitePath);
const backupsDir = path.join(dbDir, "backups");
const APP_META_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
const SCHEMA_VERSION_KEY = "schemaVersion";
const LATEST_SCHEMA_VERSION = 5;
const hadExistingDb = fs.existsSync(env.sqlitePath);

fs.mkdirSync(dbDir, { recursive: true });
fs.mkdirSync(backupsDir, { recursive: true });

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

function ensureAppMetaTable() {
  db.exec(APP_META_TABLE_SQL);
}

function getSchemaVersion() {
  ensureAppMetaTable();
  const row = db.prepare(`
    SELECT value
    FROM app_meta
    WHERE key = ?
  `).get(SCHEMA_VERSION_KEY);

  return Number(row?.value || 0);
}

function setSchemaVersion(version) {
  ensureAppMetaTable();
  db.prepare(`
    INSERT INTO app_meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value
  `).run(SCHEMA_VERSION_KEY, String(version));
}

function createBackupFile() {
  if (!hadExistingDb) {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupsDir, `app-${timestamp}.db`);
  fs.copyFileSync(env.sqlitePath, backupPath);
  return backupPath;
}

const migrations = [
  {
    version: 1,
    name: "initial schema",
    up() {
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
          bubbleOpacity REAL NOT NULL DEFAULT 0.98,
          softTopFade INTEGER NOT NULL DEFAULT 1,
          fixedBubbleWidth INTEGER NOT NULL DEFAULT 0,
          alignment TEXT NOT NULL DEFAULT 'right',
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS app_installation (
          key TEXT PRIMARY KEY,
          installationId TEXT NOT NULL UNIQUE,
          overlaySlug TEXT NOT NULL UNIQUE,
          relaySecret TEXT NOT NULL,
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
    }
  },
  {
    version: 2,
    name: "reader config additions",
    up() {
      ensureColumn("reader_config", "includeUserName", "INTEGER NOT NULL DEFAULT 1");
      ensureColumn("reader_config", "followersOnly", "INTEGER NOT NULL DEFAULT 0");
    }
  },
  {
    version: 3,
    name: "overlay config additions",
    up() {
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
  },
  {
    version: 4,
    name: "overlay installation identity source",
    up() {
      ensureColumn("app_installation", "identitySource", "TEXT NOT NULL DEFAULT 'local'");
    }
  },
  {
    version: 5,
    name: "muted users stable user id index",
    up() {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_muted_users_userId
        ON muted_users (userId);
      `);
    }
  }
];

function runMigrations() {
  db.pragma("journal_mode = WAL");
  ensureAppMetaTable();

  const currentVersion = getSchemaVersion();
  const pendingMigrations = migrations.filter((migration) => migration.version > currentVersion);

  if (!pendingMigrations.length) {
    return { currentVersion, backupPath: null, appliedMigrations: [] };
  }

  const backupPath = createBackupFile();

  db.transaction(() => {
    for (const migration of pendingMigrations) {
      migration.up();
      setSchemaVersion(migration.version);
    }
  })();

  return {
    currentVersion,
    backupPath,
    appliedMigrations: pendingMigrations.map(({ version, name }) => ({ version, name }))
  };
}

const migrationResult = runMigrations();

export async function connectDb() {
  console.info(`SQLite listo en ${env.sqlitePath}`);
  console.info(`Esquema SQLite listo en v${LATEST_SCHEMA_VERSION}`);
  console.info(`Datos del usuario en ${env.userDataDir}`);

  if (migrationResult.backupPath) {
    console.info(`Backup SQLite creado en ${migrationResult.backupPath}`);
  }

  if (env.userDataPreparation?.migratedUploads) {
    console.info("Uploads heredados copiados a la nueva carpeta de datos del usuario.");
  }

  if (migrationResult.appliedMigrations.length) {
    console.info(
      `Migraciones aplicadas: ${migrationResult.appliedMigrations
        .map((migration) => `v${migration.version} ${migration.name}`)
        .join(", ")}`
    );
  }
}
