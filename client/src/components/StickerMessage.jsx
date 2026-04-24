export default function StickerMessage({ segments }) {
  return (
    <span className="message-inline">
      {segments.map((segment, index) =>
        segment.type === "sticker" ? (
          <img
            key={`${segment.stickerId}-${index}`}
            className="inline-sticker"
            src={segment.stickerUrl}
            alt={segment.label}
          />
        ) : segment.type === "emote" ? (
          <img
            key={`${segment.emoteId}-${index}`}
            className="inline-sticker inline-emote"
            src={segment.emoteUrl}
            alt={segment.label || "Emote"}
          />
        ) : (
          <span key={`text-${index}`}>{segment.value}</span>
        )
      )}
    </span>
  );
}
