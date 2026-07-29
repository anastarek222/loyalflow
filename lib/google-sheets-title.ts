/** Pure spreadsheet-title helpers: safe to import in tests and tooling. */
export function sanitizeGoogleSheetTitle(name: string, slug: string) {
  const cleaned = name.replace(/[\[\]:*?/\\]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || slug).slice(0, 90);
}

export function getUniqueGoogleSheetTitle(baseTitle: string, existingTitles: Iterable<string>) {
  const occupied = new Set(existingTitles);
  if (!occupied.has(baseTitle)) return baseTitle;
  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const label = ` (${suffix})`;
    const candidate = `${baseTitle.slice(0, 90 - label.length)}${label}`;
    if (!occupied.has(candidate)) return candidate;
  }
  throw new Error("GOOGLE_SHEET_TITLE_CONFLICT");
}
