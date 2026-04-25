import textToSpeech from "@google-cloud/text-to-speech";
import fs from "fs";
import { reanalyzeQueuedMessages } from "./queueService.js";
import { emitAppEvent } from "./socketHub.js";
import { getReaderConfigRow, upsertReaderConfigRow } from "./sqliteStore.js";
import { getGoogleCredentialsPath, hasGoogleCredentials } from "./googleCredentialsService.js";

const DEFAULT_READER_CONFIG = {
  enabled: true,
  languageCode: "es-US",
  voiceName: "es-US-Standard-A",
  speakingRate: 1,
  pitch: 0,
  volumeGainDb: 0,
  modsOnly: false,
  followersOnly: false,
  includeUserName: true,
  noSpam: true,
  blockWeirdChars: true,
  reduceEmojiSpam: true
};

const FALLBACK_READER_VOICE_OPTIONS = [
  ["de-DE", "de-DE-Standard-A", "FEMALE"],
  ["de-DE", "de-DE-Standard-B", "MALE"],
  ["en-AU", "en-AU-Standard-A", "FEMALE"],
  ["en-AU", "en-AU-Standard-B", "MALE"],
  ["en-GB", "en-GB-Standard-A", "FEMALE"],
  ["en-GB", "en-GB-Standard-B", "MALE"],
  ["en-US", "en-US-Standard-A", "FEMALE"],
  ["en-US", "en-US-Standard-B", "MALE"],
  ["en-US", "en-US-Standard-C", "FEMALE"],
  ["es-ES", "es-ES-Standard-A", "FEMALE"],
  ["es-ES", "es-ES-Standard-B", "MALE"],
  ["es-ES", "es-ES-Standard-C", "FEMALE"],
  ["es-ES", "es-ES-Standard-E", "MALE"],
  ["es-ES", "es-ES-Standard-F", "FEMALE"],
  ["es-ES", "es-ES-Standard-G", "MALE"],
  ["es-ES", "es-ES-Standard-H", "FEMALE"],
  ["es-US", "es-US-Standard-A", "FEMALE"],
  ["es-US", "es-US-Standard-B", "MALE"],
  ["es-US", "es-US-Standard-C", "MALE"],
  ["fr-FR", "fr-FR-Standard-A", "FEMALE"],
  ["fr-FR", "fr-FR-Standard-B", "MALE"],
  ["it-IT", "it-IT-Standard-A", "FEMALE"],
  ["it-IT", "it-IT-Standard-B", "MALE"],
  ["ja-JP", "ja-JP-Standard-A", "FEMALE"],
  ["ja-JP", "ja-JP-Standard-B", "FEMALE"],
  ["ko-KR", "ko-KR-Standard-A", "FEMALE"],
  ["ko-KR", "ko-KR-Standard-B", "FEMALE"],
  ["pt-BR", "pt-BR-Standard-A", "FEMALE"],
  ["pt-BR", "pt-BR-Standard-B", "MALE"],
  ["ru-RU", "ru-RU-Standard-A", "FEMALE"],
  ["ru-RU", "ru-RU-Standard-B", "MALE"]
].map(([languageCode, voiceName, gender, tier = "Standard"]) => ({
  languageCode,
  voiceName,
  label: voiceName,
  tier,
  gender
}));

let ttsClient = null;
let ttsClientKeyPath = "";
let cachedVoiceOptions = null;
let voiceCatalogLoadedAt = 0;
const VOICE_CACHE_MS = 1000 * 60 * 60 * 12;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeNumber(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return clamp(parsed, min, max);
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function getGoogleTtsClient() {
  const credentialsPath = getGoogleCredentialsPath();
  if (!credentialsPath || !fs.existsSync(credentialsPath)) {
    return null;
  }

  if (!ttsClient || ttsClientKeyPath !== credentialsPath) {
    ttsClient = new textToSpeech.TextToSpeechClient({
      keyFilename: credentialsPath
    });
    ttsClientKeyPath = credentialsPath;
  }

  return ttsClient;
}

export function invalidateGoogleTtsResources() {
  cachedVoiceOptions = null;
  voiceCatalogLoadedAt = 0;
  ttsClient = null;
  ttsClientKeyPath = "";
}

function inferVoiceTier(voiceName = "") {
  if (voiceName.includes("Chirp3-HD")) return "Chirp3-HD";
  if (voiceName.includes("Neural2")) return "Neural2";
  if (voiceName.includes("Wavenet")) return "WaveNet";
  if (voiceName.includes("Studio")) return "Studio";
  if (voiceName.includes("News")) return "News";
  if (voiceName.includes("Polyglot")) return "Polyglot";
  if (voiceName.includes("Standard")) return "Standard";
  return "Other";
}

function sortVoiceOptions(options) {
  const tierOrder = {
    Standard: 0,
    Neural2: 1,
    WaveNet: 2,
    News: 3,
    Studio: 4,
    "Chirp3-HD": 5,
    Polyglot: 6,
    Other: 7
  };

  return [...options].sort((a, b) => {
    if (a.languageCode !== b.languageCode) {
      return a.languageCode.localeCompare(b.languageCode);
    }

    const tierDelta = (tierOrder[a.tier] ?? 99) - (tierOrder[b.tier] ?? 99);
    if (tierDelta !== 0) {
      return tierDelta;
    }

    return a.voiceName.localeCompare(b.voiceName);
  });
}

function mapVoiceResponse(voices = []) {
  const mapped = [];

  for (const voice of voices) {
    const tier = inferVoiceTier(voice.name);
    if (tier !== "Standard") {
      continue;
    }

    for (const languageCode of voice.languageCodes || []) {
      mapped.push({
        languageCode,
        voiceName: voice.name,
        label: voice.name,
        tier,
        gender: String(voice.ssmlGender || "SSML_VOICE_GENDER_UNSPECIFIED")
          .replace("SSML_VOICE_GENDER_UNSPECIFIED", "UNSPECIFIED")
      });
    }
  }

  return sortVoiceOptions(mapped);
}

async function loadVoiceCatalog() {
  if (
    cachedVoiceOptions &&
    Date.now() - voiceCatalogLoadedAt < VOICE_CACHE_MS
  ) {
    return cachedVoiceOptions;
  }

  const client = getGoogleTtsClient();
  if (!client) {
    cachedVoiceOptions = FALLBACK_READER_VOICE_OPTIONS;
    voiceCatalogLoadedAt = Date.now();
    return cachedVoiceOptions;
  }

  try {
    const [response] = await client.listVoices({});
    const mapped = mapVoiceResponse(response.voices || []);
    cachedVoiceOptions = mapped.length ? mapped : FALLBACK_READER_VOICE_OPTIONS;
  } catch (error) {
    console.warn("No se pudieron cargar las voces de Google TTS. Se usara el catalogo base.", error.message);
    cachedVoiceOptions = FALLBACK_READER_VOICE_OPTIONS;
  }

  voiceCatalogLoadedAt = Date.now();
  return cachedVoiceOptions;
}

async function getVoicesForLanguage(languageCode) {
  const catalog = await loadVoiceCatalog();
  return catalog.filter((voice) => voice.languageCode === languageCode);
}

async function normalizeLanguageCode(value) {
  const candidate = String(value || "").trim();
  const catalog = await loadVoiceCatalog();
  const matched = catalog.some((voice) => voice.languageCode === candidate);
  return matched ? candidate : DEFAULT_READER_CONFIG.languageCode;
}

async function normalizeVoiceName(languageCode, voiceName) {
  const voices = await getVoicesForLanguage(languageCode);
  const candidate = String(voiceName || "").trim();
  if (voices.some((voice) => voice.voiceName === candidate)) {
    return candidate;
  }
  return voices[0]?.voiceName || DEFAULT_READER_CONFIG.voiceName;
}

async function buildReaderConfigPayload(config) {
  const languageCode = await normalizeLanguageCode(config?.languageCode);
  const voiceName = await normalizeVoiceName(languageCode, config?.voiceName);

  return {
    enabled: normalizeBoolean(config?.enabled, DEFAULT_READER_CONFIG.enabled),
    googleCredentialsConfigured: hasGoogleCredentials(),
    languageCode,
    voiceName,
    speakingRate: normalizeNumber(
      config?.speakingRate,
      DEFAULT_READER_CONFIG.speakingRate,
      0.25,
      2
    ),
    pitch: normalizeNumber(config?.pitch, DEFAULT_READER_CONFIG.pitch, -20, 20),
    volumeGainDb: normalizeNumber(
      config?.volumeGainDb,
      DEFAULT_READER_CONFIG.volumeGainDb,
      -96,
      16
    ),
    modsOnly: normalizeBoolean(config?.modsOnly, DEFAULT_READER_CONFIG.modsOnly),
    followersOnly: normalizeBoolean(
      config?.followersOnly,
      DEFAULT_READER_CONFIG.followersOnly
    ),
    includeUserName: normalizeBoolean(
      config?.includeUserName,
      DEFAULT_READER_CONFIG.includeUserName
    ),
    noSpam: normalizeBoolean(config?.noSpam, DEFAULT_READER_CONFIG.noSpam),
    blockWeirdChars: normalizeBoolean(
      config?.blockWeirdChars,
      DEFAULT_READER_CONFIG.blockWeirdChars
    ),
    reduceEmojiSpam: normalizeBoolean(
      config?.reduceEmojiSpam,
      DEFAULT_READER_CONFIG.reduceEmojiSpam
    )
  };
}

export async function getReaderVoiceOptions() {
  return loadVoiceCatalog();
}

export async function getReaderConfig() {
  let config = getReaderConfigRow("main");
  if (!config) {
    config = upsertReaderConfigRow({
      key: "main",
      ...DEFAULT_READER_CONFIG
    });
  }

  return buildReaderConfigPayload(config);
}

export async function updateReaderConfig(input) {
  const payload = await buildReaderConfigPayload(input);
  const config = upsertReaderConfigRow({ key: "main", ...payload });

  const normalized = await buildReaderConfigPayload(config);
  await reanalyzeQueuedMessages(normalized);
  emitAppEvent("reader:config-updated", normalized);
  return normalized;
}
