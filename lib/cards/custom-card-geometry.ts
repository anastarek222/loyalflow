import { LOYALTY_CARD_ASPECT_RATIO } from "@/lib/cards/card-rendering-contract";

export const CUSTOM_CARD_ASPECT_RATIO_TOLERANCE = 0.01;
export const CUSTOM_CARD_GEOMETRY_ERROR =
  "Custom Card front artwork must use the standard ID-1 aspect ratio; an uploaded back must also use matching pixel dimensions.";

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

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const PNG_CRC_TABLE = new Uint32Array(256);
for (let index = 0; index < PNG_CRC_TABLE.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  PNG_CRC_TABLE[index] = value >>> 0;
}

function pngCrc32(bytes: Uint8Array, start: number, end: number) {
  let crc = 0xffffffff;
  for (let index = start; index < end; index += 1) {
    crc = PNG_CRC_TABLE[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readPngDimensions(bytes: Uint8Array): CustomCardArtworkDimensions | null {
  if (
    bytes.length < 45 ||
    PNG_SIGNATURE.some((value, index) => bytes[index] !== value)
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  let dimensions: CustomCardArtworkDimensions | null = null;
  let sawIdat = false;
  let sawIend = false;
  let chunkIndex = 0;

  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    const nextOffset = crcOffset + 4;
    if (nextOffset > bytes.length) return null;

    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    if (view.getUint32(crcOffset) !== pngCrc32(bytes, offset + 4, dataEnd)) {
      return null;
    }

    if (chunkIndex === 0) {
      if (type !== "IHDR" || length !== 13) return null;
      dimensions = positiveDimensions(
        view.getUint32(dataStart),
        view.getUint32(dataStart + 4),
      );
      if (!dimensions) return null;
    } else if (type === "IHDR") {
      return null;
    }

    if (type === "IDAT") sawIdat = true;
    if (type === "IEND") {
      if (length !== 0 || !sawIdat || nextOffset !== bytes.length) return null;
      sawIend = true;
      break;
    }

    offset = nextOffset;
    chunkIndex += 1;
  }

  return sawIend ? dimensions : null;
}

const JPEG_SOF_MARKERS = new Set([
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

function readJpegDimensions(bytes: Uint8Array): CustomCardArtworkDimensions | null {
  if (bytes.length < 12 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let offset = 2;
  let dimensions: CustomCardArtworkDimensions | null = null;
  let sawScan = false;
  let pendingMarker: number | null = null;

  while (offset < bytes.length || pendingMarker !== null) {
    let marker: number;
    if (pendingMarker !== null) {
      marker = pendingMarker;
      pendingMarker = null;
    } else {
      if (bytes[offset] !== 0xff) return null;
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) return null;
      marker = bytes[offset++];
    }

    if (marker === 0x00 || marker === 0xd8) return null;
    if (marker === 0xd9) return sawScan ? dimensions : null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > bytes.length) return null;

    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;

    if (JPEG_SOF_MARKERS.has(marker)) {
      if (length < 7) return null;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      dimensions = positiveDimensions(width, height);
      if (!dimensions) return null;
    }

    const segmentEnd = offset + length;
    if (marker !== 0xda) {
      offset = segmentEnd;
      continue;
    }

    if (!dimensions || length < 6) return null;
    sawScan = true;
    offset = segmentEnd;
    let foundMarker = false;
    while (offset < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      while (offset < bytes.length && bytes[offset] === 0xff) offset += 1;
      if (offset >= bytes.length) return null;
      const scanMarker = bytes[offset++];
      if (scanMarker === 0x00) continue;
      if (scanMarker >= 0xd0 && scanMarker <= 0xd7) continue;
      pendingMarker = scanMarker;
      foundMarker = true;
      break;
    }
    if (!foundMarker) return null;
  }

  return null;
}

function readUint32Le(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function readWebpDimensions(bytes: Uint8Array): CustomCardArtworkDimensions | null {
  if (
    bytes.length < 26 ||
    String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" ||
    String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP" ||
    readUint32Le(bytes, 4) !== bytes.length - 8
  ) {
    return null;
  }

  let offset = 12;
  let dimensions: CustomCardArtworkDimensions | null = null;
  let sawImagePayload = false;

  while (offset + 8 <= bytes.length) {
    const chunk = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const size = readUint32Le(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    const nextOffset = dataEnd + (size % 2);
    if (dataEnd > bytes.length || nextOffset > bytes.length) return null;

    if (chunk === "VP8X") {
      if (size < 10) return null;
      dimensions = positiveDimensions(
        1 +
          bytes[dataStart + 4] +
          (bytes[dataStart + 5] << 8) +
          (bytes[dataStart + 6] << 16),
        1 +
          bytes[dataStart + 7] +
          (bytes[dataStart + 8] << 8) +
          (bytes[dataStart + 9] << 16),
      );
      if (!dimensions) return null;
    } else if (chunk === "VP8L") {
      if (size < 5 || bytes[dataStart] !== 0x2f) return null;
      const bits = readUint32Le(bytes, dataStart + 1);
      const parsed = positiveDimensions(
        (bits & 0x3fff) + 1,
        ((bits >>> 14) & 0x3fff) + 1,
      );
      if (!parsed) return null;
      dimensions ??= parsed;
      sawImagePayload = true;
    } else if (chunk === "VP8 ") {
      if (
        size < 10 ||
        bytes[dataStart + 3] !== 0x9d ||
        bytes[dataStart + 4] !== 0x01 ||
        bytes[dataStart + 5] !== 0x2a
      ) {
        return null;
      }
      const parsed = positiveDimensions(
        (bytes[dataStart + 6] | (bytes[dataStart + 7] << 8)) & 0x3fff,
        (bytes[dataStart + 8] | (bytes[dataStart + 9] << 8)) & 0x3fff,
      );
      if (!parsed) return null;
      dimensions ??= parsed;
      sawImagePayload = true;
    } else if (chunk === "ANMF") {
      if (size < 16) return null;
      sawImagePayload = true;
    }

    offset = nextOffset;
  }

  if (offset !== bytes.length || !dimensions || !sawImagePayload) return null;
  return dimensions;
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
    Math.abs(ratio / LOYALTY_CARD_ASPECT_RATIO - 1) <=
    CUSTOM_CARD_ASPECT_RATIO_TOLERANCE
  );
}

export async function validateCustomCardArtworkGeometry(file: File) {
  const dimensions = await getCustomCardArtworkDimensions(file);
  return Boolean(dimensions && hasStandardCustomCardAspectRatio(dimensions));
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
