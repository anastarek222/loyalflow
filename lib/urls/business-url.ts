const explicitProtocolPattern = /^[a-z][a-z\d+.-]*:/i;

export function normalizeWebsiteUrl(value: string | null | undefined) {
  const input = value?.trim() ?? "";
  if (!input) return "";

  const candidate = explicitProtocolPattern.test(input)
    ? input
    : `https://${input}`;

  try {
    const url = new URL(candidate);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      !url.hostname ||
      /\s/.test(input)
    ) {
      return null;
    }

    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function formatWebsiteForCard(value: string | null | undefined) {
  const normalized = normalizeWebsiteUrl(value);
  if (!normalized) return null;

  const url = new URL(normalized);
  const pathname = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.hostname.replace(/^www\./i, "")}${pathname}${url.search}`;
}
