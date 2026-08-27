export const BUSINESS_LOGO_MAX_BYTES = 500 * 1024;

export const BUSINESS_LOGO_ACCEPTED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const BUSINESS_LOGO_ACCEPT_ATTRIBUTE =
  BUSINESS_LOGO_ACCEPTED_MIME_TYPES.join(",");

export function isSupportedBusinessLogoMimeType(value: string) {
  return (BUSINESS_LOGO_ACCEPTED_MIME_TYPES as readonly string[]).includes(value);
}
