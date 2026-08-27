export const SUPPORTED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type SupportedImageMimeType = (typeof SUPPORTED_IMAGE_MIME_TYPES)[number];

export const BUSINESS_LOGO_MIME_TYPES = SUPPORTED_IMAGE_MIME_TYPES;
export const BUSINESS_LOGO_MAX_KB = 500;
export const BUSINESS_LOGO_MAX_BYTES = BUSINESS_LOGO_MAX_KB * 1024;
export const BUSINESS_LOGO_ACCEPT = BUSINESS_LOGO_MIME_TYPES.join(",");

export function isSupportedImageMimeType(
  value: string,
): value is SupportedImageMimeType {
  return (SUPPORTED_IMAGE_MIME_TYPES as readonly string[]).includes(value);
}

export function isBusinessLogoMimeType(
  value: string,
): value is SupportedImageMimeType {
  return isSupportedImageMimeType(value);
}
