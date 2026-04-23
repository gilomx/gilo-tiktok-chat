import mongoose from "mongoose";

const queueStateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    paused: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const QueueState = mongoose.model("QueueState", queueStateSchema);

