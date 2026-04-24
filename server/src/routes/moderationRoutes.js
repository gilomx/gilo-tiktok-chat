import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { normalizeText } from "../utils/text.js";
import {
  createForbiddenWord,
  createReplacementRule,
  deleteForbiddenWord,
  deleteReplacementRule
} from "../services/sqliteStore.js";

const router = express.Router();

router.post("/forbidden-words", asyncHandler(async (req, res) => {
  const value = String(req.body.value || "").trim();
  if (!value) {
    return res.status(400).json({ error: "La palabra prohibida es obligatoria" });
  }

  const item = createForbiddenWord({
    value,
    normalizedValue: normalizeText(value),
    notes: req.body.notes || ""
  });
  res.status(201).json(item);
}));

router.delete("/forbidden-words/:id", asyncHandler(async (req, res) => {
  deleteForbiddenWord(req.params.id);
  res.status(204).send();
}));

router.post("/replacement-rules", asyncHandler(async (req, res) => {
  const from = String(req.body.from || "").trim();
  const to = String(req.body.to || "").trim();
  if (!from || !to) {
    return res.status(400).json({ error: "Los campos 'buscar' y 'reemplazo' son obligatorios" });
  }

  const item = createReplacementRule({
    from,
    normalizedFrom: normalizeText(from),
    to
  });
  res.status(201).json(item);
}));

router.delete("/replacement-rules/:id", asyncHandler(async (req, res) => {
  deleteReplacementRule(req.params.id);
  res.status(204).send();
}));

export default router;
