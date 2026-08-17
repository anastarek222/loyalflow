import { STANDARD_CARD_ASPECT_RATIO } from "@/lib/cards/standard-card";

export const CUSTOM_CARD_ASPECT_RATIO_TOLERANCE = 0.01;
export const CUSTOM_CARD_GEOMETRY_ERROR =
  "Custom Card front and back artwork must use matching pixel dimensions and the standard ID-1 aspect ratio.";

export type CustomCardArtworkDimensions = Readonly<{
  width: number;
  height: number;
}>;

function positiveDimensions(
  width: number,
  height: number,
): CustomCardArtworkDimensions | null {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
    ? { width, height }
    : null;
}

function readPngDimensions(bytes: Uint8Array): CustomCardArtworkDimensions | null {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return positiveDimensions(view.getUint32(16), view.getUint32(20));
}

function readJpegDimensions(bytes: Uint8Array): CustomCardArtworkDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  const sof = new Set([
    0xc0,
    0xc1,
    0xc2,
    0xc3,
    0xc5,
    0xc6,
    0xc7,
    0xc9,
    0xca,
    0xcb,
    0xcd,
    0xce,
    0xcf,
  ]);

  while (offset + 8 < bytes.length) {
    while (offset < bytes.length && bytes[offset] !== 0xff) offset += 1;
    while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
    if (offset >= bytes.length) break;

    const marker = bytes[offset++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker >= 0xd0 && marker <= 0xd7) continue;
    if (offset + 2 > bytes.length) break;

    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;

    if (sof.has(marker) && length >= 7) {
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return positiveDimensions(width, height);
    }

    offset += length;
  }

  return null;
}

function readWebpDimensions(bytes: Uint8Array): CustomCardArtworkDimensions | null {
  if (
    bytes.length < 30 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP"
  ) {
    return null;
  }

  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  if (chunk === "VP8X") {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return positiveDimensions(width, height);
  }

  if (chunk === "VP8L" && bytes.length >= 25 && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return positiveDimensions((bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1);
  }

  if (
    chunk === "VP8 " &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return positiveDimensions(width, height);
  }

  return null;
}

export async function getCustomCardArtworkDimensions(
  file: File,
): Promise<CustomCardArtworkDimensions | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/png") return readPngDimensions(bytes);
  if (file.type === "image/jpeg") return readJpegDimensions(bytes);
  if (file.type === "image/webp") return readWebpDimensions(bytes);
  return null;
}

export function hasStandardCustomCardAspectRatio(
  dimensions: CustomCardArtworkDimensions,
) {
  const ratio = dimensions.width / dimensions.height;
  return (
    Math.abs(ratio / STANDARD_CARD_ASPECT_RATIO - 1) <=
    CUSTOM_CARD_ASPECT_RATIO_TOLERANCE
  );
}

export async function validateCustomCardArtworkGeometryPair(
  front: File,
  back: File,
) {
  const [frontDimensions, backDimensions] = await Promise.all([
    getCustomCardArtworkDimensions(front),
    getCustomCardArtworkDimensions(back),
  ]);

  if (!frontDimensions || !backDimensions) return false;
  if (
    frontDimensions.width !== backDimensions.width ||
    frontDimensions.height !== backDimensions.height
  ) {
    return false;
  }

  return hasStandardCustomCardAspectRatio(frontDimensions);
}
