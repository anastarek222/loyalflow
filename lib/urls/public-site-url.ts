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
 * customization is configuration-only through NEXT_PUBLIC_SITE_URL.
 */
export function resolvePublicSiteUrl(
  environment: Record<string, string | undefined> = process.env,
) {
  const configured = environment.NEXT_PUBLIC_SITE_URL?.trim();
  return normalizePublicSiteUrl(configured || DEFAULT_PUBLIC_SITE_URL);
}

export const PUBLIC_SITE_URL = resolvePublicSiteUrl();

export function publicSiteUrl(path = "/") {
  return new URL(path, `${PUBLIC_SITE_URL}/`).toString();
}
