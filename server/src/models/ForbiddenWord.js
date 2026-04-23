import mongoose from "mongoose";

const forbiddenWordSchema = new mongoose.Schema(
  {
    value: { type: String, required: true, unique: true, trim: true },
    normalizedValue: { type: String, required: true, index: true },
    notes: { type: String, default: "" }
  },
  { timestamps: true }
);

export const ForbiddenWord = mongoose.model("ForbiddenWord", forbiddenWordSchema);

