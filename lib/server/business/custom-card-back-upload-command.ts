import { randomUUID } from "node:crypto";

import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  customCardStorageConfigured,
  findCustomCardArtworkVersion,
  readPrivateCustomCardArtwork,
  uploadCustomCardArtwork,
  validateCustomCardArtwork,
  validateCustomCardArtworkPair,
} from "@/lib/cards/custom-card-storage";
import prisma from "@/lib/prisma";

export type CustomCardBackUploadCommandResult =
  | Readonly<{
      ok: true;
      version: string;
      frontUrl: string;
      backUrl: string;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "STORAGE_UNAVAILABLE"
        | "INVALID_UPLOAD"
        | "SUBSCRIPTION_RESTRICTED";
    }>;

async function privateArtworkAsFile(url: string, fileName: string) {
  const stored = await readPrivateCustomCardArtwork(url);
  if (!stored) return null;

  const bytes = await new Response(stored.stream).arrayBuffer();
  return new File([bytes], fileName, {
    type: stored.blob.contentType || "application/octet-stream",
  });
}

/**
 * Adds or replaces a Back without sending Front + Back through one request.
 *
 * The selected Front is read from private Blob storage, geometry is validated
 * server-side against the newly uploaded Back, and a new immutable artwork
 * version is created. The original draft remains untouched.
 */
export async function uploadCustomCardBackCommand(input: {
  businessId: string;
  sourceVersion: string;
  back: unknown;
}): Promise<CustomCardBackUploadCommandResult> {
  if (!customCardStorageConfigured()) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }

  if (!validateCustomCardArtwork(input.back)) {
    return { ok: false, reason: "INVALID_UPLOAD" };
  }

  const source = await findCustomCardArtworkVersion(
    input.businessId,
    input.sourceVersion,
  );
  if (!source) {
    return { ok: false, reason: "INVALID_UPLOAD" };
  }

  const front = await privateArtworkAsFile(source.frontUrl, "front-artwork");
  if (!front || !validateCustomCardArtwork(front)) {
    return { ok: false, reason: "INVALID_UPLOAD" };
  }

  if (!(await validateCustomCardArtworkPair(front, input.back))) {
    return { ok: false, reason: "INVALID_UPLOAD" };
  }

  if (
    !(await canBusinessPerformSubscriptionOperation(
      prisma,
      input.businessId,
      "EXPAND",
    ))
  ) {
    return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" };
  }

  const version = randomUUID();
  const uploaded = await uploadCustomCardArtwork({
    businessId: input.businessId,
    version,
    front,
    back: input.back,
  });

  if (!uploaded.backUrl) {
    return { ok: false, reason: "INVALID_UPLOAD" };
  }

  return {
    ok: true,
    version,
    frontUrl: uploaded.frontUrl,
    backUrl: uploaded.backUrl,
  };
}
