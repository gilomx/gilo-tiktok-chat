export function normalizeText(value = "") {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function maskWord(value = "") {
  return value.trim() ? "*" : value;
}

export function compactSpaces(value = "") {
  return value.replace(/\s+/g, " ").trim();
}
