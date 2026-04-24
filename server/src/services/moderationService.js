import { compactSpaces, escapeRegex, maskWord, normalizeText } from "../utils/text.js";
import { listForbiddenWords, listReplacementRules, listStickers } from "./sqliteStore.js";

const FOREIGN_SCRIPT_REGEX = /[\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hebrew}\p{Script=Thai}\p{Script=Greek}]+/gu;
const EMOJI_CLUSTER_REGEX = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*/gu;

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

function skipForeignFilter(text) {
  return {
    text,
    matches: []
  };
}

function buildTextSegments(text, stickers) {
  const parts = text.split(/(\s+)/);
  const segments = [];

  for (const part of parts) {
    if (!part) {
      continue;
    }

    const normalized = normalizeText(part);
    const sticker = stickers.find((item) => item.normalizedKeyword === normalized);

    if (sticker) {
      segments.push({
        type: "sticker",
        value: sticker.keyword,
        stickerId: sticker._id,
        stickerUrl: sticker.fileUrl,
        label: sticker.label,
        ttsLabel: sticker.ttsLabel || sticker.keyword
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

function buildSegments(text, stickers, emotes = []) {
  const normalizedEmotes = [...emotes]
    .map((emote) => ({
      emoteId: String(emote?.emoteId || ""),
      emoteImageUrl: String(emote?.emoteImageUrl || ""),
      placeInComment: Number.parseInt(emote?.placeInComment, 10)
    }))
    .filter((emote) => emote.emoteId && emote.emoteImageUrl && Number.isFinite(emote.placeInComment))
    .sort((a, b) => a.placeInComment - b.placeInComment);

  if (!normalizedEmotes.length) {
    return buildTextSegments(text, stickers);
  }

  const segments = [];
  let cursor = 0;

  for (const emote of normalizedEmotes) {
    const targetIndex = Math.max(0, Math.min(text.length, emote.placeInComment));
    const chunk = text.slice(cursor, targetIndex);
    segments.push(...buildTextSegments(chunk, stickers));
    segments.push({
      type: "emote",
      value: "",
      emoteId: emote.emoteId,
      emoteUrl: emote.emoteImageUrl,
      label: "Emote"
    });
    cursor = targetIndex;
  }

  segments.push(...buildTextSegments(text.slice(cursor), stickers));
  return segments;
}

function reduceEmojiSpamInText(text = "") {
  const parts = [];
  let lastIndex = 0;

  for (const match of text.matchAll(EMOJI_CLUSTER_REGEX)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, matchIndex) });
    }
    parts.push({ type: "emoji", value: match[0] });
    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  let output = "";
  let emojiBuffer = [];

  const flushEmojiBuffer = () => {
    if (!emojiBuffer.length) {
      return;
    }

    const reduced = [];
    const seen = new Set();
    for (const emoji of emojiBuffer) {
      if (seen.has(emoji)) {
        continue;
      }
      seen.add(emoji);
      reduced.push(emoji);
      if (reduced.length >= 3) {
        break;
      }
    }

    if (reduced.length) {
      if (output && !/\s$/.test(output)) {
        output += " ";
      }
      output += reduced.join(" ");
    }

    emojiBuffer = [];
  };

  for (const part of parts) {
    if (part.type === "emoji") {
      emojiBuffer.push(part.value);
      continue;
    }

    if (emojiBuffer.length && /^\s*$/.test(part.value)) {
      continue;
    }

    flushEmojiBuffer();
    output += part.value;
  }

  flushEmojiBuffer();
  return output;
}

export function buildTtsMessageFromSegments(segments, options = {}) {
  const reduceEmojiSpam = Boolean(options.reduceEmojiSpam);

  return compactSpaces(
    segments
      .map((segment) => {
        if (segment.type === "text") {
          const normalizedText = segment.value
            .replace(/\*+/g, " ")
            .replace(/\s([,.;:!?])/g, "$1");
          return reduceEmojiSpam
            ? reduceEmojiSpamInText(normalizedText)
            : normalizedText;
        }

        if (segment.type === "emote") {
          return "";
        }

        return segment.ttsLabel || segment.value || segment.label || "";
      })
      .join(" ")
  );
}

export async function moderateIncomingMessage(originalMessage, emotes = [], options = {}) {
  const [forbiddenWords, replacementRules, stickers] = await Promise.all([
    Promise.resolve(listForbiddenWords()),
    Promise.resolve(listReplacementRules()),
    Promise.resolve(listStickers())
  ]);

  const replacementResult = applyReplacements(originalMessage, replacementRules);
  const forbiddenResult = applyForbiddenWords(replacementResult.text, forbiddenWords);
  const foreignResult = options.blockWeirdChars === false
    ? skipForeignFilter(forbiddenResult.text)
    : applyForeignFilter(forbiddenResult.text);
  const renderedSegments = buildSegments(foreignResult.text, stickers, emotes);
  const ttsMessage = buildTtsMessageFromSegments(renderedSegments, {
    reduceEmojiSpam: options.reduceEmojiSpam
  });

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
