import mongoose from "mongoose";

const mutedUserSchema = new mongoose.Schema(
  {
    userId: { type: String, default: "" },
    uniqueId: { type: String, required: true, unique: true, index: true },
    normalizedUniqueId: { type: String, required: true, index: true },
    nickname: { type: String, default: "" },
    normalizedNickname: { type: String, default: "", index: true },
    profilePictureUrl: { type: String, default: "" },
    muted: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const MutedUser = mongoose.model("MutedUser", mutedUserSchema);

