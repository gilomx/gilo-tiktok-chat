import mongoose from "mongoose";

const overlayConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    bubbleBaseColor: { type: String, required: true, default: "#9a5cff" },
    modBadgeColor: { type: String, required: true, default: "#ff6e8a" },
    bubbleOpacity: { type: Number, required: true, default: 0.98, min: 0.2, max: 1 },
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
