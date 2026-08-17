import { randomUUID } from "node:crypto";

import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  customCardStorageConfigured,
  uploadCustomCardArtwork,
  validateCustomCardArtwork,
  validateCustomCardArtworkPair,
} from "@/lib/cards/custom-card-storage";
import prisma from "@/lib/prisma";

export type CustomCardUploadCommandResult =
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

/**
 * Authoritative Custom Card draft-upload boundary.
 *
 * The command owns storage readiness, bounded front/back validation including
 * matching ID-1 geometry, the persisted EXPAND entitlement re-check immediately
 * before the external write, and immutable version creation. Authentication and
 * tenant-management policy remain in the Server Action transport.
 */
export async function uploadCustomCardDraftCommand(input: {
  businessId: string;
  front: unknown;
  back: unknown;
}): Promise<CustomCardUploadCommandResult> {
  if (!customCardStorageConfigured()) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }

  if (
    !validateCustomCardArtwork(input.front) ||
    !validateCustomCardArtwork(input.back)
  ) {
    return { ok: false, reason: "INVALID_UPLOAD" };
  }

  if (!(await validateCustomCardArtworkPair(input.front, input.back))) {
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
    back: input.back,
  });

  return {
    ok: true,
    version,
    frontUrl: uploaded.frontUrl,
    backUrl: uploaded.backUrl,
  };
}
