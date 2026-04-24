import mongoose from "mongoose";

const overlayConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    bubbleBaseColor: { type: String, required: true, default: "#8c00ff" },
    modBadgeColor: { type: String, required: true, default: "#ff6e8a" },
    nameTextColor: { type: String, required: true, default: "#ffffff" },
    handleTextColor: { type: String, required: true, default: "#ffffff" },
    messageTextColor: { type: String, required: true, default: "#ffffff" },
    nameFontSizeRem: { type: Number, required: true, default: 0.9 },
    handleFontSizeRem: { type: Number, required: true, default: 0.74 },
    messageFontSizeRem: { type: Number, required: true, default: 0.84 },
    stickerSizePx: { type: Number, required: true, default: 63 },
    bubbleOpacity: { type: Number, required: true, default: 0.98, min: 0.2, max: 1 },
    softTopFade: { type: Boolean, required: true, default: true },
    fixedBubbleWidth: { type: Boolean, required: true, default: false },
    alignment: {
      type: String,
      required: true,
      enum: ["left", "right"],
      default: "right"
    }
  },
  { timestamps: true }
);

export const OverlayConfig = mongoose.model("OverlayConfig", overlayConfigSchema);
