/** Cash App tags: 1-20 chars, letters / numbers / underscore. A leading $ is optional. */
export function normalizeCashtag(raw: unknown): string | null {
  const value = String(raw ?? "")
    .trim()
    .replace(/^\$/, "")
    .toLowerCase();
  return /^[a-z0-9_]{1,20}$/.test(value) ? value : null;
}

export function asString(raw: unknown) {
  return typeof raw === "string" ? raw.trim() : "";
}

export function asPositiveInt(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
