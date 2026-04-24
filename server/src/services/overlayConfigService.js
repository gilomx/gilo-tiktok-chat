import { OverlayConfig } from "../models/OverlayConfig.js";
import { emitAppEvent } from "./socketHub.js";

const DEFAULT_COLOR = "#9a5cff";
const DEFAULT_MOD_BADGE_COLOR = "#ff6e8a";
const DEFAULT_OPACITY = 0.98;
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

function normalizeHexColor(value) {
  const candidate = String(value || "").trim();
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(candidate)
    ? candidate
    : DEFAULT_COLOR;
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

function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  const normalizedAlpha = normalizeOpacity(alpha);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${normalizedAlpha})`;
}

export function buildOverlayTheme(baseColor, opacity = DEFAULT_OPACITY, modBadgeColor = DEFAULT_MOD_BADGE_COLOR) {
  const normalized = normalizeHexColor(baseColor);
  const normalizedBadgeColor = normalizeHexColor(modBadgeColor);
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
    modBadgeText: mixWithWhite(normalizedBadgeColor, 0.28)
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
        bubbleOpacity: DEFAULT_OPACITY,
        alignment: DEFAULT_ALIGNMENT
      })
    ).toObject();
  }

  return {
    ...config,
    theme: buildOverlayTheme(config.bubbleBaseColor, config.bubbleOpacity, config.modBadgeColor)
  };
}

export async function updateOverlayConfig(input) {
  const bubbleBaseColor = normalizeHexColor(input?.bubbleBaseColor);
  const modBadgeColor = normalizeHexColor(input?.modBadgeColor || DEFAULT_MOD_BADGE_COLOR);
  const bubbleOpacity = normalizeOpacity(input?.bubbleOpacity);
  const alignment = normalizeAlignment(input?.alignment);
  const config = await OverlayConfig.findOneAndUpdate(
    { key: "main" },
    { key: "main", bubbleBaseColor, modBadgeColor, bubbleOpacity, alignment },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const payload = {
    ...config,
    theme: buildOverlayTheme(config.bubbleBaseColor, config.bubbleOpacity, config.modBadgeColor)
  };

  emitAppEvent("overlay:config-updated", payload);
  return payload;
}
