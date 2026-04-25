import express from "express";
import multer from "multer";
import { getInstallationPublicInfo } from "../services/appInstallationService.js";
import { getOverlayConfig, updateOverlayConfig } from "../services/overlayConfigService.js";
import { getLiveStats } from "../services/liveStatsService.js";
import { getRecentMessages } from "../services/messageStoreService.js";
import { getOverlayRelayStatus } from "../services/overlayRelayService.js";
import { getRecentLiveUsers, muteLiveUser, searchLiveUsers, searchMutedUsers, unmuteLiveUser } from "../services/liveUsersService.js";
import { getQueueSnapshot } from "../services/queueService.js";
import { getReaderConfig, getReaderVoiceOptions, invalidateGoogleTtsResources, updateReaderConfig } from "../services/readerConfigService.js";
import { listForbiddenWords, listReplacementRules, listStickers } from "../services/sqliteStore.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeText } from "../utils/text.js";
import { saveGoogleCredentialsFile } from "../services/googleCredentialsService.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function rankMatch(items, field, query) {
  const normalizedQuery = normalizeText(query);
  return items
    .map((item) => {
      const value = normalizeText(item[field] || "");
      let score = 0;
      if (value === normalizedQuery) score = 100;
      else if (value.startsWith(normalizedQuery)) score = 75;
      else if (value.includes(normalizedQuery)) score = 50;
      return { item, score };
    })
    .filter((entry) => entry.score > 0 || !query)
    .sort((a, b) => b.score - a.score || new Date(b.item.createdAt) - new Date(a.item.createdAt))
    .slice(0, 10)
    .map((entry) => entry.item);
}

function rankMatchWithPagination(items, field, query, page = 1, pageSize = 20) {
  const normalizedQuery = normalizeText(query);
  const rankedItems = items
    .map((item) => {
      const value = normalizeText(item[field] || "");
      let score = 0;
      if (value === normalizedQuery) score = 100;
      else if (value.startsWith(normalizedQuery)) score = 75;
      else if (value.includes(normalizedQuery)) score = 50;
      return { item, score };
    })
    .filter((entry) => entry.score > 0 || !query)
    .sort((a, b) => b.score - a.score || new Date(b.item.createdAt) - new Date(a.item.createdAt))
    .map((entry) => entry.item);

  const safePageSize = Math.max(1, Number(pageSize) || 20);
  const total = rankedItems.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const safePage = Math.min(Math.max(1, Number(page) || 1), totalPages);
  const start = (safePage - 1) * safePageSize;

  return {
    items: rankedItems.slice(start, start + safePageSize),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
    query: String(query || "")
  };
}

router.get("/summary", asyncHandler(async (_req, res) => {
  const relayStatus = getOverlayRelayStatus();
  const [queue, recentMessages, forbiddenWords, replacementRules, stickerItems, overlayConfig, liveUsers, mutedUsers, readerConfig, readerVoiceOptions] = await Promise.all([
    getQueueSnapshot(),
    Promise.resolve(getRecentMessages(10)),
    Promise.resolve(listForbiddenWords()),
    Promise.resolve(listReplacementRules()),
    Promise.resolve(listStickers()),
    getOverlayConfig(),
    getRecentLiveUsers(),
    searchMutedUsers(""),
    getReaderConfig(),
    getReaderVoiceOptions()
  ]);

  res.json({
    queue,
    recentMessages,
    forbidden: rankMatchWithPagination(forbiddenWords, "value", "", 1, 20),
    replacements: rankMatchWithPagination(replacementRules, "from", "", 1, 20),
    stickers: rankMatchWithPagination(stickerItems, "keyword", "", 1, 20),
    overlayConfig,
    publicOverlay: getInstallationPublicInfo(relayStatus),
    readerConfig,
    readerVoiceOptions,
    liveStats: getLiveStats(),
    liveUsers,
    mutedUsers
  });
}));

router.get("/forbidden-words", asyncHandler(async (req, res) => {
  const items = listForbiddenWords();
  res.json(
    rankMatchWithPagination(
      items,
      "value",
      req.query.q || "",
      req.query.page || 1,
      req.query.pageSize || 20
    )
  );
}));

router.get("/replacement-rules", asyncHandler(async (req, res) => {
  const items = listReplacementRules();
  res.json(
    rankMatchWithPagination(
      items,
      "from",
      req.query.q || "",
      req.query.page || 1,
      req.query.pageSize || 20
    )
  );
}));

router.get("/stickers", asyncHandler(async (req, res) => {
  const items = listStickers();
  res.json(
    rankMatchWithPagination(
      items,
      "keyword",
      req.query.q || "",
      req.query.page || 1,
      req.query.pageSize || 20
    )
  );
}));

router.get("/messages/recent", asyncHandler(async (_req, res) => {
  res.json(getRecentMessages(10));
}));

router.get("/overlay-config", asyncHandler(async (_req, res) => {
  res.json(await getOverlayConfig());
}));

router.get("/overlay-public", asyncHandler(async (_req, res) => {
  res.json(getInstallationPublicInfo(getOverlayRelayStatus()));
}));

router.put("/overlay-config", asyncHandler(async (req, res) => {
  res.json(await updateOverlayConfig(req.body));
}));

router.get("/reader-config", asyncHandler(async (_req, res) => {
  res.json({
    config: await getReaderConfig(),
    voiceOptions: await getReaderVoiceOptions()
  });
}));

router.put("/reader-config", asyncHandler(async (req, res) => {
  res.json(await updateReaderConfig(req.body));
}));

router.post("/google-credentials", upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Debes subir el archivo JSON de Google." });
  }

  saveGoogleCredentialsFile(req.file.buffer);
  invalidateGoogleTtsResources();

  res.status(201).json({
    config: await getReaderConfig(),
    voiceOptions: await getReaderVoiceOptions()
  });
}));

router.get("/live-users", asyncHandler(async (req, res) => {
  res.json(await searchLiveUsers(req.query.q || ""));
}));

router.get("/muted-users", asyncHandler(async (req, res) => {
  res.json(await searchMutedUsers(req.query.q || ""));
}));

router.post("/live-users/mute", asyncHandler(async (req, res) => {
  await muteLiveUser(req.body);
  res.status(204).send();
}));

router.post("/live-users/unmute", asyncHandler(async (req, res) => {
  await unmuteLiveUser(String(req.body.uniqueId || ""));
  res.status(204).send();
}));

export default router;
