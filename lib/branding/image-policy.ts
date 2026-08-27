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
export const BUSINESS_LOGO_OUTPUT_SIZE_PX = 512;
export const BUSINESS_LOGO_OUTPUT_MIME_TYPE = "image/webp";
export const BUSINESS_LOGO_OUTPUT_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58] as const;

export type BusinessLogoFitMode = "FIT" | "FILL";

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

export function isBusinessLogoUploadAllowed(file: {
  size: number;
  type: string;
}) {
  return (
    file.size > 0 &&
    file.size <= BUSINESS_LOGO_MAX_BYTES &&
    isBusinessLogoMimeType(file.type)
  );
}
