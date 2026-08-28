import { randomUUID } from "node:crypto";

import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import {
  customCardStorageConfigured,
  uploadCustomCardArtwork,
} from "@/lib/cards/custom-card-storage";
import {
  type CustomCardUploadValidationReason,
  validateCustomCardUploadPair,
} from "@/lib/cards/custom-card-upload-validation";
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
        | CustomCardUploadValidationReason
        | "SUBSCRIPTION_RESTRICTED";
    }>;

/**
 * Authoritative Custom Card draft-upload boundary.
 *
 * A Custom Card draft is always an immutable Front + Back pair. The command
 * owns storage readiness, bounded file validation, matching ID-1 geometry,
 * the persisted EXPAND entitlement re-check immediately before the external
 * write, and immutable version creation. Authentication and tenant-management
 * policy remain in the Server Action transport.
 */
export async function uploadCustomCardDraftCommand(input: {
  businessId: string;
  front: unknown;
  back: unknown;
}): Promise<CustomCardUploadCommandResult> {
  if (!customCardStorageConfigured()) {
    return { ok: false, reason: "STORAGE_UNAVAILABLE" };
  }

  const validation = await validateCustomCardUploadPair(
    input.front,
    input.back,
  );
  if (!validation.ok) return validation;

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
    front: validation.front,
    back: validation.back,
  });

  return {
    ok: true,
    version,
    frontUrl: uploaded.frontUrl,
    backUrl: uploaded.backUrl,
  };
}
