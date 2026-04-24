import express from "express";
import { ForbiddenWord } from "../models/ForbiddenWord.js";
import { ReplacementRule } from "../models/ReplacementRule.js";
import { Sticker } from "../models/Sticker.js";
import { getOverlayConfig, updateOverlayConfig } from "../services/overlayConfigService.js";
import { getLiveStats } from "../services/liveStatsService.js";
import { getRecentMessages } from "../services/messageStoreService.js";
import { getRecentLiveUsers, muteLiveUser, searchLiveUsers, searchMutedUsers, unmuteLiveUser } from "../services/liveUsersService.js";
import { getQueueSnapshot } from "../services/queueService.js";
import { getReaderConfig, getReaderVoiceOptions, updateReaderConfig } from "../services/readerConfigService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeText } from "../utils/text.js";

const router = express.Router();

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
  const [queue, recentMessages, forbiddenWords, replacementRules, stickerItems, overlayConfig, liveUsers, mutedUsers, readerConfig, readerVoiceOptions] = await Promise.all([
    getQueueSnapshot(),
    Promise.resolve(getRecentMessages(10)),
    ForbiddenWord.find().sort({ createdAt: -1 }).lean(),
    ReplacementRule.find().sort({ createdAt: -1 }).lean(),
    Sticker.find().sort({ createdAt: -1 }).lean(),
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
    readerConfig,
    readerVoiceOptions,
    liveStats: getLiveStats(),
    liveUsers,
    mutedUsers
  });
}));

router.get("/forbidden-words", asyncHandler(async (req, res) => {
  const items = await ForbiddenWord.find().sort({ createdAt: -1 }).lean();
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
  const items = await ReplacementRule.find().sort({ createdAt: -1 }).lean();
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
  const items = await Sticker.find().sort({ createdAt: -1 }).lean();
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
