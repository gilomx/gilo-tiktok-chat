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
        ) : (
          <span key={`text-${index}`}>{segment.value}</span>
        )
      )}
    </span>
  );
}

