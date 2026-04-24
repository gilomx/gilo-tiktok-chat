import express from "express";
import { getMessageById } from "../services/messageStoreService.js";
import { synthesizeSpeech } from "../services/ttsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/message/:id", asyncHandler(async (req, res) => {
  const message = getMessageById(req.params.id);
  if (!message) {
    return res.status(404).json({ error: "Mensaje no encontrado" });
  }

  const audioBuffer = await synthesizeSpeech(message.ttsMessage);
  res.setHeader("Content-Type", "audio/mpeg");
  res.send(Buffer.from(audioBuffer, "base64"));
}));

export default router;
