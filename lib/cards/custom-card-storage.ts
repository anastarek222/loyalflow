import "server-only";

import { get, list, put, type ListBlobResultBlob } from "@vercel/blob";
import { STANDARD_CARD_ASPECT_RATIO } from "@/lib/cards/standard-card";

export const CUSTOM_CARD_MAX_FILE_BYTES = 4 * 1024 * 1024;
export const CUSTOM_CARD_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
export const CUSTOM_CARD_ASPECT_RATIO_TOLERANCE = 0.01;
export const CUSTOM_CARD_GEOMETRY_ERROR =
  "Custom Card front and back artwork must use matching pixel dimensions and the standard ID-1 aspect ratio.";

export type CustomCardSide = "front" | "back";

export type CustomCardArtworkVersion = {
  id: string;
  uploadedAt: Date;
  frontUrl: string;
  backUrl: string;
};

const versionPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function customCardStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

export function isCustomCardVersion(value: string) {
  return versionPattern.test(value);
}

export function validateCustomCardArtwork(file: unknown): file is File {
  return (
    file instanceof File &&
    file.size > 0 &&
    file.size <= CUSTOM_CARD_MAX_FILE_BYTES &&
    CUSTOM_CARD_ALLOWED_TYPES.includes(
      file.type as (typeof CUSTOM_CARD_ALLOWED_TYPES)[number],
    )
  );
}

type ArtworkDimensions = Readonly<{ width: number; height: number }>;

function positiveDimensions(width: number, height: number): ArtworkDimensions | null {
  return Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0
    ? { width, height }
    : null;
}

function readPngDimensions(bytes: Uint8Array): ArtworkDimensions | null {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return positiveDimensions(view.getUint32(16), view.getUint32(20));
}

function readJpegDimensions(bytes: Uint8Array): ArtworkDimensions | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
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

function readWebpDimensions(bytes: Uint8Array): ArtworkDimensions | null {
  if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") return null;
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
  if (chunk === "VP8 " && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
    const width = (bytes[26] | (bytes[27] << 8)) & 0x3fff;
    const height = (bytes[28] | (bytes[29] << 8)) & 0x3fff;
    return positiveDimensions(width, height);
  }
  return null;
}

export async function getCustomCardArtworkDimensions(file: File): Promise<ArtworkDimensions | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (file.type === "image/png") return readPngDimensions(bytes);
  if (file.type === "image/jpeg") return readJpegDimensions(bytes);
  if (file.type === "image/webp") return readWebpDimensions(bytes);
  return null;
}

export async function validateCustomCardArtworkPair(front: unknown, back: unknown) {
  if (!validateCustomCardArtwork(front) || !validateCustomCardArtwork(back)) return false;
  const [frontDimensions, backDimensions] = await Promise.all([
    getCustomCardArtworkDimensions(front),
    getCustomCardArtworkDimensions(back),
  ]);
  if (!frontDimensions || !backDimensions) return false;
  if (frontDimensions.width !== backDimensions.width || frontDimensions.height !== backDimensions.height) return false;
  const ratio = frontDimensions.width / frontDimensions.height;
  return Math.abs(ratio / STANDARD_CARD_ASPECT_RATIO - 1) <= CUSTOM_CARD_ASPECT_RATIO_TOLERANCE;
}

function extensionFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function customCardVersionPrefix(businessId: string, version: string) {
  if (!isCustomCardVersion(version)) throw new Error("Invalid artwork version");
  return `custom-card/${businessId}/${version}/`;
}

export async function uploadCustomCardArtwork(input: {
  businessId: string;
  version: string;
  front: File;
  back: File;
}) {
  if (!(await validateCustomCardArtworkPair(input.front, input.back))) {
    throw new Error(CUSTOM_CARD_GEOMETRY_ERROR);
  }

  const prefix = customCardVersionPrefix(input.businessId, input.version);
  const [front, back] = await Promise.all(
    (["front", "back"] as const).map((side) => {
      const file = input[side];
      return put(`${prefix}${side}.${extensionFor(file)}`, file, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: file.type,
        maximumSizeInBytes: CUSTOM_CARD_MAX_FILE_BYTES,
      });
    }),
  );
  return { frontUrl: front.url, backUrl: back.url };
}

function groupCompleteVersions(blobs: ListBlobResultBlob[]) {
  const versions = new Map<string, Partial<CustomCardArtworkVersion> & { uploadedAt: Date }>();
  for (const blob of blobs) {
    const match = blob.pathname.match(/^custom-card\/[^/]+\/([^/]+)\/(front|back)\.(?:png|jpe?g|webp)$/i);
    if (!match || !isCustomCardVersion(match[1])) continue;
    const current = versions.get(match[1]) ?? { uploadedAt: blob.uploadedAt };
    current.uploadedAt = current.uploadedAt > blob.uploadedAt ? current.uploadedAt : blob.uploadedAt;
    if (match[2] === "front") current.frontUrl = blob.url;
    if (match[2] === "back") current.backUrl = blob.url;
    versions.set(match[1], current);
  }
  return [...versions.entries()]
    .filter((entry): entry is [string, CustomCardArtworkVersion] => Boolean(entry[1].frontUrl && entry[1].backUrl))
    .map(([id, value]) => ({ ...value, id }))
    .sort((left, right) => right.uploadedAt.getTime() - left.uploadedAt.getTime());
}

export async function listCustomCardArtworkVersions(businessId: string) {
  if (!customCardStorageConfigured()) return [];
  const result = await list({ prefix: `custom-card/${businessId}/`, limit: 100 });
  return groupCompleteVersions(result.blobs);
}

export async function findCustomCardArtworkVersion(businessId: string, version: string) {
  if (!customCardStorageConfigured() || !isCustomCardVersion(version)) return null;
  const result = await list({ prefix: customCardVersionPrefix(businessId, version), limit: 4 });
  return groupCompleteVersions(result.blobs)[0] ?? null;
}

export function isManagedCustomCardArtworkUrl(value: string | null | undefined, businessId?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    const expected = businessId ? `/custom-card/${businessId}/` : "/custom-card/";
    return url.protocol === "https:" && url.hostname.endsWith(".blob.vercel-storage.com") && url.pathname.startsWith(expected);
  } catch {
    return false;
  }
}

export function publicCustomCardArtworkUrl(token: string, side: CustomCardSide, storedUrl: string | null | undefined, businessId: string) {
  return isManagedCustomCardArtworkUrl(storedUrl, businessId)
    ? `/api/card-artwork/${encodeURIComponent(token)}/${side}`
    : storedUrl ?? null;
}

export async function readPrivateCustomCardArtwork(url: string) {
  if (!isManagedCustomCardArtworkUrl(url)) return null;
  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return result;
}
