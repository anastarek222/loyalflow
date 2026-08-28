import "server-only";

import { get, list, put, type ListBlobResultBlob } from "@vercel/blob";
import {
  CUSTOM_CARD_GEOMETRY_ERROR,
  validateCustomCardArtworkGeometry,
} from "@/lib/cards/custom-card-geometry";
import {
  CUSTOM_CARD_MAX_FILE_BYTES,
  validateCustomCardArtworkFile,
  validateCustomCardUploadPair,
} from "@/lib/cards/custom-card-upload-validation";

export { CUSTOM_CARD_GEOMETRY_ERROR } from "@/lib/cards/custom-card-geometry";

export {
  CUSTOM_CARD_ALLOWED_TYPES,
  CUSTOM_CARD_MAX_FILE_BYTES,
  CUSTOM_CARD_MAX_PAIR_BYTES,
} from "@/lib/cards/custom-card-upload-validation";

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
  return validateCustomCardArtworkFile(file);
}

export async function validateCustomCardArtworkPair(front: unknown, back: unknown) {
  return (await validateCustomCardUploadPair(front, back)).ok;
}

export async function validateSingleCustomCardArtwork(file: unknown) {
  if (!validateCustomCardArtwork(file)) return false;
  return validateCustomCardArtworkGeometry(file);
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
  const validGeometry = await validateCustomCardArtworkPair(input.front, input.back);
  if (!validGeometry) {
    throw new Error(CUSTOM_CARD_GEOMETRY_ERROR);
  }

  const prefix = customCardVersionPrefix(input.businessId, input.version);
  const front = await put(`${prefix}front.${extensionFor(input.front)}`, input.front, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: input.front.type,
    maximumSizeInBytes: CUSTOM_CARD_MAX_FILE_BYTES,
  });

  const back = await put(`${prefix}back.${extensionFor(input.back)}`, input.back, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: input.back.type,
    maximumSizeInBytes: CUSTOM_CARD_MAX_FILE_BYTES,
  });
  return { frontUrl: front.url, backUrl: back.url };
}

function groupCompleteVersions(blobs: ListBlobResultBlob[]) {
  const versions = new Map<
    string,
    Partial<CustomCardArtworkVersion> & { uploadedAt: Date }
  >();
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
    .filter(([, value]) => Boolean(value.frontUrl && value.backUrl))
    .map(([id, value]): CustomCardArtworkVersion => ({
      id,
      uploadedAt: value.uploadedAt,
      frontUrl: value.frontUrl as string,
      backUrl: value.backUrl as string,
    }))
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
