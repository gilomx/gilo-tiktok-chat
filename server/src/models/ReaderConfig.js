import mongoose from "mongoose";

const readerConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    enabled: { type: Boolean, required: true, default: true },
    languageCode: { type: String, required: true, default: "es-US" },
    voiceName: { type: String, required: true, default: "es-US-Standard-A" },
    speakingRate: { type: Number, required: true, default: 1, min: 0.25, max: 2 },
    pitch: { type: Number, required: true, default: 0, min: -20, max: 20 },
    volumeGainDb: { type: Number, required: true, default: 0, min: -96, max: 16 }
  },
  { timestamps: true }
);

export const ReaderConfig = mongoose.model("ReaderConfig", readerConfigSchema);
