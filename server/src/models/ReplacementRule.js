import mongoose from "mongoose";

const replacementRuleSchema = new mongoose.Schema(
  {
    from: { type: String, required: true, unique: true, trim: true },
    normalizedFrom: { type: String, required: true, index: true },
    to: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export const ReplacementRule = mongoose.model("ReplacementRule", replacementRuleSchema);

