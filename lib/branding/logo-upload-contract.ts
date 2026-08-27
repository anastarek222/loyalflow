export const BUSINESS_LOGO_INPUT_MAX_BYTES = 500 * 1024;
export const BUSINESS_LOGO_OUTPUT_SIZE_PX = 512;
export const BUSINESS_LOGO_OUTPUT_MIME_TYPE = "image/webp";
export const BUSINESS_LOGO_OUTPUT_QUALITY = 0.92;

export const BUSINESS_LOGO_ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export function isBusinessLogoUploadAllowed(file: {
  size: number;
  type: string;
}) {
  return (
    file.size > 0 &&
    file.size <= BUSINESS_LOGO_INPUT_MAX_BYTES &&
    BUSINESS_LOGO_ALLOWED_MIME_TYPES.includes(
      file.type as (typeof BUSINESS_LOGO_ALLOWED_MIME_TYPES)[number],
    )
  );
}
