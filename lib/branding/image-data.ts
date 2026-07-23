const imageMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

type ImageMimeType = (typeof imageMimeTypes)[number];

function matchesImageSignature(
  bytes: Buffer,
  mimeType: ImageMimeType
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

function isImageMimeType(value: string): value is ImageMimeType {
  return imageMimeTypes.includes(value as ImageMimeType);
}

/** Converts an explicitly allowed image upload to a bounded canonical data URL. */
export async function imageFileToDataUrl(
  file: File,
  maximumBytes: number
) {
  if (
    file.size <= 0 ||
    file.size > maximumBytes ||
    !isImageMimeType(file.type)
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

  if (!match || !isImageMimeType(match[1])) return null;

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
