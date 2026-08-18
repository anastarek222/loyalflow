import { randomUUID } from "node:crypto";

import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  customCardStorageConfigured,
  uploadCustomCardArtwork,
  validateCustomCardArtwork,
  validateCustomCardArtworkPair,
  validateSingleCustomCardArtwork,
} from "@/lib/cards/custom-card-storage";
import prisma from "@/lib/prisma";

export type CustomCardUploadCommandResult =
  | Readonly<{
      ok: true;
      version: string;
      frontUrl: string;
      backUrl: string | null;
    }>
  | Readonly<{
      ok: false;
      reason:
        | "STORAGE_UNAVAILABLE"
        | "INVALID_UPLOAD"
        | "SUBSCRIPTION_RESTRICTED";
    }>;

/**
 * Authoritative Custom Card draft-upload boundary.
 *
 * The command owns storage readiness, bounded front validation, optional
 * matching ID-1 back validation, the persisted EXPAND entitlement re-check
 * immediately before the external write, and immutable version creation.
 * Authentication and tenant-management policy remain in the Server Action
 * transport. When no back is uploaded, the renderer owns the safe generated
 * back and no second Blob object is created.
 */
export async function uploadCustomCardDraftCommand(input: {
  businessId: string;
  front: unknown;
  back?: unknown;
}): Promise<CustomCardUploadCommandResult> {
  if (!customCardStorageConfigured()) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }

  if (!validateCustomCardArtwork(input.front)) {
    return { ok: false, reason: "INVALID_UPLOAD" };
  }

  const back =
    input.back instanceof File && input.back.size === 0 ? null : input.back ?? null;
  if (back !== null && !validateCustomCardArtwork(back)) {
    return { ok: false, reason: "INVALID_UPLOAD" };
  }

  const validGeometry = back
    ? await validateCustomCardArtworkPair(input.front, back)
    : await validateSingleCustomCardArtwork(input.front);
  if (!validGeometry) {
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
    front: input.front,
    back,
  });

  return {
    ok: true,
    version,
    frontUrl: uploaded.frontUrl,
    backUrl: uploaded.backUrl,
  };
}
