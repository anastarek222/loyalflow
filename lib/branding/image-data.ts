import {
  isSupportedImageMimeType,
  type SupportedImageMimeType,
} from "@/lib/branding/image-policy";

function matchesImageSignature(
  bytes: Buffer,
  mimeType: SupportedImageMimeType
) {
  if (mimeType === "image/png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }

  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  return bytes.length >= 12 &&
    bytes.subarray(0, 4).equals(Buffer.from("RIFF")) &&
    bytes.subarray(8, 12).equals(Buffer.from("WEBP"));
}

/** Allows only remote image URLs that browser-rendered branding already supports. */
export function isValidRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Converts an explicitly allowed image upload to a bounded canonical data URL. */
export async function imageFileToDataUrl(
  file: File,
  maximumBytes: number
) {
  if (
    file.size <= 0 ||
    file.size > maximumBytes ||
    !isSupportedImageMimeType(file.type)
  ) {
    return null;
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  if (bytes.length !== file.size || !matchesImageSignature(bytes, file.type)) {
    return null;
  }

  return `data:${file.type};base64,${bytes.toString("base64")}`;
}

/**
 * Existing uploaded branding can be rendered by ImageResponse without making
 * any server-side network request. Remote URLs deliberately return null: they
 * are browser-rendered on the card itself, but never fetched by the server.
 */
export function getSafeImageDataUrl(
  value: string | null | undefined,
  maximumBytes: number
) {
  if (!value) return null;

  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);

  if (!match || !isSupportedImageMimeType(match[1])) return null;

  const bytes = Buffer.from(match[2], "base64");

  if (
    bytes.length <= 0 ||
    bytes.length > maximumBytes ||
    bytes.toString("base64") !== match[2] ||
    !matchesImageSignature(bytes, match[1])
  ) {
    return null;
  }

  return value;
}

/**
 * Business logo persistence accepts two deliberately different contracts:
 * a short browser-rendered remote URL, or a bounded validated inline upload.
 * Keeping the remote URL limit separate prevents a valid image data URL from
 * being rejected merely because its base64 representation is longer than the
 * ordinary text field contract.
 */
export function isValidBusinessLogoStorageValue(
  value: string | null | undefined,
  maximumBytes: number,
  maximumRemoteUrlCharacters = 500,
) {
  if (!value) return true;

  if (isValidRemoteImageUrl(value)) {
    return value.length <= maximumRemoteUrlCharacters;
  }

  return Boolean(getSafeImageDataUrl(value, maximumBytes));
}
