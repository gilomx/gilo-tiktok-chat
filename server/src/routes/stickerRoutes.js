import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env.js";
import { createSticker, deleteSticker, getStickerById } from "../services/sqliteStore.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeText } from "../utils/text.js";

const router = express.Router();

const stickerDir = path.resolve(env.uploadsDir, "stickers");
fs.mkdirSync(stickerDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, stickerDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Solo se permiten imagenes"));
  }
});

router.post("/", upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Debes subir un archivo de sticker" });
  }

  const keyword = String(req.body.keyword || "").trim();
  const label = String(req.body.label || keyword).trim();
  if (!keyword) {
    return res.status(400).json({ error: "La palabra disparadora del sticker es obligatoria" });
  }

  const relativeUrl = `/uploads/stickers/${req.file.filename}`;

  const sticker = createSticker({
    keyword,
    normalizedKeyword: normalizeText(keyword),
    label,
    fileName: req.file.filename,
    fileUrl: relativeUrl,
    mimeType: req.file.mimetype,
    ttsLabel: String(req.body.ttsLabel || "").trim()
  });

  res.status(201).json(sticker);
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const sticker = getStickerById(req.params.id);
  if (sticker) {
    deleteSticker(req.params.id);
  }
  if (sticker) {
    const target = path.resolve(stickerDir, sticker.fileName);
    fs.rmSync(target, { force: true });
  }
  res.status(204).send();
}));

export default router;
