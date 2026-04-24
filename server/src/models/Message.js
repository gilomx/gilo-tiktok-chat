import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sourceEvent: { type: String, required: true },
    sender: {
      userId: { type: String, default: "" },
      uniqueId: { type: String, default: "" },
      nickname: { type: String, default: "" },
      profilePictureUrl: { type: String, default: "" },
      isModerator: { type: Boolean, default: false }
    },
    originalMessage: { type: String, required: true },
    filteredMessage: { type: String, required: true },
    ttsMessage: { type: String, required: true },
    renderedSegments: [
      {
        type: { type: String, enum: ["text", "sticker", "emote"], required: true },
        value: { type: String, default: "" },
        stickerId: { type: mongoose.Schema.Types.ObjectId, ref: "Sticker" },
        stickerUrl: { type: String, default: "" },
        emoteId: { type: String, default: "" },
        emoteUrl: { type: String, default: "" },
        label: { type: String, default: "" }
      }
    ],
    flags: {
      forbiddenWords: [{ type: String }],
      replacements: [
        {
          from: String,
          to: String
        }
      ],
      foreignSegments: [{ type: String }]
    },
    rawEvent: { type: mongoose.Schema.Types.Mixed, default: {} },
    queueStatus: {
      type: String,
      enum: ["queued", "speaking", "done", "removed", "muted", "skipped"],
      default: "queued",
      index: true
    },
    spokenAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", messageSchema);
