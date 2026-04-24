import { OverlayConfig } from "../models/OverlayConfig.js";
import { emitAppEvent } from "./socketHub.js";

const DEFAULT_COLOR = "#8c00ff";
const DEFAULT_MOD_BADGE_COLOR = "#ff6e8a";
const DEFAULT_TEXT_COLOR = "#ffffff";
const DEFAULT_NAME_FONT_SIZE_REM = 0.9;
const DEFAULT_HANDLE_FONT_SIZE_REM = 0.74;
const DEFAULT_MESSAGE_FONT_SIZE_REM = 0.84;
const DEFAULT_STICKER_SIZE_PX = 63;
const DEFAULT_OPACITY = 0.98;
const DEFAULT_SOFT_TOP_FADE = true;
const DEFAULT_FIXED_BUBBLE_WIDTH = false;
const DEFAULT_ALIGNMENT = "right";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized;

  const parsed = Number.parseInt(full, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixWithWhite(hex, ratio) {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * ratio,
    g: rgb.g + (255 - rgb.g) * ratio,
    b: rgb.b + (255 - rgb.b) * ratio
  });
}

function mixWithBlack(hex, ratio) {
  const rgb = hexToRgb(hex);
  return rgbToHex({
    r: rgb.r * (1 - ratio),
    g: rgb.g * (1 - ratio),
    b: rgb.b * (1 - ratio)
  });
}

function normalizeHexColor(value, fallback = DEFAULT_COLOR) {
  const candidate = String(value || "").trim();
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(candidate)
    ? candidate
    : fallback;
}

function normalizeOpacity(value) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return DEFAULT_OPACITY;
  }
  return clamp(parsed, 0.2, 1);
}

function normalizeAlignment(value) {
  return value === "left" ? "left" : DEFAULT_ALIGNMENT;
}

function normalizeFontSize(value, fallback, min, max) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return clamp(parsed, min, max);
}

function normalizeStickerSize(value) {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return DEFAULT_STICKER_SIZE_PX;
  }
  return clamp(parsed, 48, 96);
}

function normalizeBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  const normalizedAlpha = normalizeOpacity(alpha);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${normalizedAlpha})`;
}

export function buildOverlayTheme(
  baseColor,
  opacity = DEFAULT_OPACITY,
  modBadgeColor = DEFAULT_MOD_BADGE_COLOR,
  nameTextColor = DEFAULT_TEXT_COLOR,
  handleTextColor = DEFAULT_TEXT_COLOR,
  messageTextColor = DEFAULT_TEXT_COLOR,
  nameFontSizeRem = DEFAULT_NAME_FONT_SIZE_REM,
  handleFontSizeRem = DEFAULT_HANDLE_FONT_SIZE_REM,
  messageFontSizeRem = DEFAULT_MESSAGE_FONT_SIZE_REM,
  stickerSizePx = DEFAULT_STICKER_SIZE_PX
) {
  const normalized = normalizeHexColor(baseColor);
  const normalizedBadgeColor = normalizeHexColor(modBadgeColor, DEFAULT_MOD_BADGE_COLOR);
  const normalizedNameTextColor = normalizeHexColor(nameTextColor, DEFAULT_TEXT_COLOR);
  const normalizedHandleTextColor = normalizeHexColor(handleTextColor, DEFAULT_TEXT_COLOR);
  const normalizedMessageTextColor = normalizeHexColor(messageTextColor, DEFAULT_TEXT_COLOR);
  const normalizedNameFontSizeRem = normalizeFontSize(nameFontSizeRem, DEFAULT_NAME_FONT_SIZE_REM, 0.76, 1.2);
  const normalizedHandleFontSizeRem = normalizeFontSize(handleFontSizeRem, DEFAULT_HANDLE_FONT_SIZE_REM, 0.62, 1);
  const normalizedMessageFontSizeRem = normalizeFontSize(messageFontSizeRem, DEFAULT_MESSAGE_FONT_SIZE_REM, 0.72, 1.12);
  const normalizedStickerSizePx = normalizeStickerSize(stickerSizePx);
  const normalizedOpacity = normalizeOpacity(opacity);
  return {
    bubbleBaseColor: normalized,
    modBadgeColor: normalizedBadgeColor,
    bubbleTopColor: mixWithWhite(normalized, 0.18),
    bubbleBottomColor: mixWithBlack(normalized, 0.18),
    bubbleShadowColor: mixWithBlack(normalized, 0.58),
    bubbleTopRgba: hexToRgba(mixWithWhite(normalized, 0.18), normalizedOpacity),
    bubbleBottomRgba: hexToRgba(mixWithBlack(normalized, 0.18), normalizedOpacity),
    modBadgeBackground: hexToRgba(normalizedBadgeColor, 0.18),
    modBadgeBorder: hexToRgba(mixWithWhite(normalizedBadgeColor, 0.18), 0.32),
    modBadgeText: mixWithWhite(normalizedBadgeColor, 0.28),
    nameTextColor: normalizedNameTextColor,
    handleTextColor: normalizedHandleTextColor,
    messageTextColor: normalizedMessageTextColor,
    nameFontSizeRem: normalizedNameFontSizeRem,
    handleFontSizeRem: normalizedHandleFontSizeRem,
    messageFontSizeRem: normalizedMessageFontSizeRem,
    stickerSizePx: normalizedStickerSizePx
  };
}

export async function getOverlayConfig() {
  let config = await OverlayConfig.findOne({ key: "main" }).lean();
  if (!config) {
    config = (
      await OverlayConfig.create({
        key: "main",
        bubbleBaseColor: DEFAULT_COLOR,
        modBadgeColor: DEFAULT_MOD_BADGE_COLOR,
        nameTextColor: DEFAULT_TEXT_COLOR,
        handleTextColor: DEFAULT_TEXT_COLOR,
        messageTextColor: DEFAULT_TEXT_COLOR,
        nameFontSizeRem: DEFAULT_NAME_FONT_SIZE_REM,
        handleFontSizeRem: DEFAULT_HANDLE_FONT_SIZE_REM,
        messageFontSizeRem: DEFAULT_MESSAGE_FONT_SIZE_REM,
        stickerSizePx: DEFAULT_STICKER_SIZE_PX,
        bubbleOpacity: DEFAULT_OPACITY,
        softTopFade: DEFAULT_SOFT_TOP_FADE,
        fixedBubbleWidth: DEFAULT_FIXED_BUBBLE_WIDTH,
        alignment: DEFAULT_ALIGNMENT
      })
    ).toObject();
  }

  return {
    ...config,
    theme: buildOverlayTheme(
      config.bubbleBaseColor,
      config.bubbleOpacity,
      config.modBadgeColor,
      config.nameTextColor,
      config.handleTextColor,
      config.messageTextColor,
      config.nameFontSizeRem,
      config.handleFontSizeRem,
      config.messageFontSizeRem,
      config.stickerSizePx
    )
  };
}

export async function updateOverlayConfig(input) {
  const bubbleBaseColor = normalizeHexColor(input?.bubbleBaseColor);
  const modBadgeColor = normalizeHexColor(input?.modBadgeColor, DEFAULT_MOD_BADGE_COLOR);
  const nameTextColor = normalizeHexColor(input?.nameTextColor, DEFAULT_TEXT_COLOR);
  const handleTextColor = normalizeHexColor(input?.handleTextColor, DEFAULT_TEXT_COLOR);
  const messageTextColor = normalizeHexColor(input?.messageTextColor, DEFAULT_TEXT_COLOR);
  const nameFontSizeRem = normalizeFontSize(input?.nameFontSizeRem, DEFAULT_NAME_FONT_SIZE_REM, 0.76, 1.2);
  const handleFontSizeRem = normalizeFontSize(input?.handleFontSizeRem, DEFAULT_HANDLE_FONT_SIZE_REM, 0.62, 1);
  const messageFontSizeRem = normalizeFontSize(input?.messageFontSizeRem, DEFAULT_MESSAGE_FONT_SIZE_REM, 0.72, 1.12);
  const stickerSizePx = normalizeStickerSize(input?.stickerSizePx);
  const bubbleOpacity = normalizeOpacity(input?.bubbleOpacity);
  const softTopFade = normalizeBoolean(input?.softTopFade, DEFAULT_SOFT_TOP_FADE);
  const fixedBubbleWidth = normalizeBoolean(input?.fixedBubbleWidth, DEFAULT_FIXED_BUBBLE_WIDTH);
  const alignment = normalizeAlignment(input?.alignment);
  const config = await OverlayConfig.findOneAndUpdate(
    { key: "main" },
    {
      key: "main",
      bubbleBaseColor,
      modBadgeColor,
      nameTextColor,
      handleTextColor,
      messageTextColor,
      nameFontSizeRem,
      handleFontSizeRem,
      messageFontSizeRem,
      stickerSizePx,
      bubbleOpacity,
      softTopFade,
      fixedBubbleWidth,
      alignment
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const payload = {
    ...config,
    theme: buildOverlayTheme(
      config.bubbleBaseColor,
      config.bubbleOpacity,
      config.modBadgeColor,
      config.nameTextColor,
      config.handleTextColor,
      config.messageTextColor,
      config.nameFontSizeRem,
      config.handleFontSizeRem,
      config.messageFontSizeRem,
      config.stickerSizePx
    )
  };

  emitAppEvent("overlay:config-updated", payload);
  return payload;
}
