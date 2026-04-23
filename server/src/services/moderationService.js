import { ForbiddenWord } from "../models/ForbiddenWord.js";
import { ReplacementRule } from "../models/ReplacementRule.js";
import { Sticker } from "../models/Sticker.js";
import { compactSpaces, escapeRegex, maskWord, normalizeText } from "../utils/text.js";

const FOREIGN_SCRIPT_REGEX = /[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hebrew}\p{Script=Thai}\p{Script=Greek}]+/gu;

function detectForeignSegments(text) {
  return text.match(FOREIGN_SCRIPT_REGEX) || [];
}

function applyReplacements(text, rules) {
  let nextText = text;
  const matches = [];

  for (const rule of rules) {
    const regex = new RegExp(escapeRegex(rule.from), "gi");
    if (regex.test(nextText)) {
      nextText = nextText.replace(regex, rule.to);
      matches.push({ from: rule.from, to: rule.to });
    }
  }

  return { text: nextText, matches };
}

function applyForbiddenWords(text, words) {
  let nextText = text;
  const matches = [];

  for (const word of words) {
    const regex = new RegExp(`\\b${escapeRegex(word.value)}\\b`, "gi");
    if (regex.test(nextText)) {
      nextText = nextText.replace(regex, (found) => {
        matches.push(found);
        return maskWord(found);
      });
    }
  }

  return { text: nextText, matches };
}

function applyForeignFilter(text) {
  const matches = detectForeignSegments(text);
  return {
    text: text.replace(FOREIGN_SCRIPT_REGEX, (value) => maskWord(value)),
    matches
  };
}

function buildSegments(text, stickers) {
  const parts = text.split(/(\s+)/);
  const segments = [];

  for (const part of parts) {
    const normalized = normalizeText(part);
    const sticker = stickers.find((item) => item.normalizedKeyword === normalized);

    if (sticker) {
      segments.push({
        type: "sticker",
        value: sticker.keyword,
        stickerId: sticker._id,
        stickerUrl: sticker.fileUrl,
        label: sticker.label
      });
      continue;
    }

    segments.push({
      type: "text",
      value: part
    });
  }

  return segments;
}

function buildTtsText(segments, stickers) {
  const stickerMap = new Map(stickers.map((item) => [String(item._id), item]));

  return compactSpaces(
    segments
      .map((segment) => {
        if (segment.type === "text") {
          return segment.value
            .replace(/\*+/g, " ")
            .replace(/\s([,.;:!?])/g, "$1");
        }

        const sticker = stickerMap.get(String(segment.stickerId));
        return sticker?.ttsLabel || sticker?.keyword || segment.value || "";
      })
      .join(" ")
  );
}

export async function moderateIncomingMessage(originalMessage) {
  const [forbiddenWords, replacementRules, stickers] = await Promise.all([
    ForbiddenWord.find().sort({ createdAt: -1 }).lean(),
    ReplacementRule.find().sort({ createdAt: -1 }).lean(),
    Sticker.find().sort({ createdAt: -1 }).lean()
  ]);

  const replacementResult = applyReplacements(originalMessage, replacementRules);
  const forbiddenResult = applyForbiddenWords(replacementResult.text, forbiddenWords);
  const foreignResult = applyForeignFilter(forbiddenResult.text);
  const renderedSegments = buildSegments(foreignResult.text, stickers);
  const ttsMessage = buildTtsText(renderedSegments, stickers) || "mensaje sin contenido legible";

  return {
    filteredMessage: foreignResult.text,
    ttsMessage,
    renderedSegments,
    flags: {
      replacements: replacementResult.matches,
      forbiddenWords: forbiddenResult.matches,
      foreignSegments: foreignResult.matches
    }
  };
}
