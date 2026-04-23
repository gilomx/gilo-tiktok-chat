import express from "express";
import { getQueueSnapshot, setQueuePaused, claimNextMessage, completeCurrentMessage, removeQueuedMessage, clearQueuedMessages } from "../services/queueService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/", asyncHandler(async (_req, res) => {
  res.json(await getQueueSnapshot());
}));

router.post("/pause", asyncHandler(async (_req, res) => {
  res.json(await setQueuePaused(true));
}));

router.post("/resume", asyncHandler(async (_req, res) => {
  res.json(await setQueuePaused(false));
}));

router.post("/claim-next", asyncHandler(async (_req, res) => {
  const item = await claimNextMessage();
  res.json(item);
}));

router.post("/:id/complete", asyncHandler(async (req, res) => {
  const item = await completeCurrentMessage(req.params.id);
  res.json(item);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const item = await removeQueuedMessage(req.params.id);
  res.json(item);
}));

router.delete("/", asyncHandler(async (_req, res) => {
  res.json(await clearQueuedMessages());
}));

export default router;
