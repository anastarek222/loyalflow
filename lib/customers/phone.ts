export function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");

  return cleaned.replace(/(?!^)\+/g, "");
}
