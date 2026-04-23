import mongoose from "mongoose";

const stickerSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: true, unique: true, trim: true },
    normalizedKeyword: { type: String, required: true, index: true },
    label: { type: String, required: true, trim: true },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    ttsLabel: { type: String, default: "" }
  },
  { timestamps: true }
);

export const Sticker = mongoose.model("Sticker", stickerSchema);

