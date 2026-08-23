const DEFAULT_PUBLIC_SITE_URL = "https://loyalflow-gray.vercel.app";

function normalizePublicSiteUrl(value: string) {
  const url = new URL(value);
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

/**
 * Canonical public marketing origin.
 *
 * Keep this separate from request/preview origins so Staging and PR previews
 * never advertise themselves as the canonical public website. Final domain
 * customization only needs to replace this authority in one place.
 */
export const PUBLIC_SITE_URL = normalizePublicSiteUrl(DEFAULT_PUBLIC_SITE_URL);

export function publicSiteUrl(path = "/") {
  return new URL(path, `${PUBLIC_SITE_URL}/`).toString();
}
