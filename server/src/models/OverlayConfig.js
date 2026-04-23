import mongoose from "mongoose";

const overlayConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    bubbleBaseColor: { type: String, required: true, default: "#9a5cff" },
    bubbleOpacity: { type: Number, required: true, default: 0.98, min: 0.2, max: 1 }
  },
  { timestamps: true }
);

export const OverlayConfig = mongoose.model("OverlayConfig", overlayConfigSchema);
