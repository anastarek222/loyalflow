import { buildCatalogAuditActivity } from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { hasFeatureEntitlement, isWithinPlanLimit } from "@/lib/entitlements";
import { configurationToPlanLimits } from "@/lib/entitlements-server";
import { normalizeOfferInput } from "@/lib/offers/catalog";
import {
  getOfferTagAudienceId,
  isOfferAudienceSelectorForLoyaltyMode,
} from "@/lib/offers/eligibility";
import prisma from "@/lib/prisma";
import { lockBusinessCapacity } from "@/lib/server/business/business-capacity-lock";
import type { LoyaltyMode } from "@/generated/prisma/client";

export type OfferWriteActor = Readonly<{
  id: string;
  businessId: string | null;
  email?: string | null;
}>;

export type NormalizedOfferInput = ReturnType<typeof normalizeOfferInput>;

type OfferWriteFailure = Readonly<{
  ok: false;
  reason:
    | "BUSINESS_NOT_FOUND"
    | "TARGET_NOT_FOUND"
    | "SUBSCRIPTION_RESTRICTED"
    | "PLAN_FEATURE"
    | "PLAN_LIMIT"
    | "INVALID_AUDIENCE";
}>;

export type OfferWriteCommandResult =
  Readonly<{ ok: true }> | OfferWriteFailure;

type OfferAudienceValidationClient = Pick<typeof prisma, "customerTag">;
type OfferAudienceValidationInput = Pick<
  NormalizedOfferInput,
  "eligibility" | "segment"
>;

async function hasValidOfferAudience(
  client: OfferAudienceValidationClient,
  businessId: string,
  loyaltyMode: LoyaltyMode,
  offer: OfferAudienceValidationInput,
) {
  if (offer.eligibility !== "SEGMENT") {
    return offer.segment === null;
  }
  if (
    !offer.segment ||
    !isOfferAudienceSelectorForLoyaltyMode(offer.segment, loyaltyMode)
  ) {
    return false;
  }

  const tagId = getOfferTagAudienceId(offer.segment);
  if (!tagId) return true;

  const tag = await client.customerTag.findFirst({
    where: { id: tagId, businessId },
    select: { id: true },
  });
  return Boolean(tag);
}

/**
 * Authoritative non-financial Offer creation boundary.
 *
 * The caller keeps authentication, tenant authorization, input parsing,
 * presentation preflight, redirects and revalidation. This command owns the
 * persisted subscription/plan/audience checks and the atomic Offer + audit write.
 */
export async function createOfferCommand(input: {
  businessId: string;
  offer: NormalizedOfferInput;
  actor: OfferWriteActor;
}): Promise<OfferWriteCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    await lockBusinessCapacity(transaction, input.businessId);

    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "EXPAND",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const business = await transaction.business.findUnique({
      where: { id: input.businessId },
      select: { plan: true, loyaltyMode: true },
    });
    if (!business) {
      return { ok: false, reason: "BUSINESS_NOT_FOUND" } as const;
    }

    const [configuration, offerCount] = await Promise.all([
      transaction.planConfiguration.findUnique({
        where: { plan: business.plan },
        select: {
          customerLimit: true,
          userLimit: true,
          branchLimit: true,
          offerLimit: true,
          rewardLimit: true,
        },
      }),
      transaction.offer.count({ where: { businessId: input.businessId } }),
    ]);
    const planLimits = configurationToPlanLimits(configuration, business.plan);

    if (!hasFeatureEntitlement(business.plan, "OFFERS")) {
      return { ok: false, reason: "PLAN_FEATURE" } as const;
    }
    if (
      !(await hasValidOfferAudience(
        transaction,
        input.businessId,
        business.loyaltyMode,
        input.offer,
      ))
    ) {
      return { ok: false, reason: "INVALID_AUDIENCE" } as const;
    }
    if (
      !isWithinPlanLimit(business.plan, "OFFERS", offerCount, 1, planLimits)
    ) {
      return { ok: false, reason: "PLAN_LIMIT" } as const;
    }

    const offer = await transaction.offer.create({
      data: { ...input.offer, businessId: input.businessId },
      select: { id: true, name: true },
    });
    await transaction.businessActivity.create({
      data: buildCatalogAuditActivity({
        entity: "OFFER",
        operation: "CREATE",
        businessId: input.businessId,
        actor: input.actor,
        item: offer,
        activityContext,
      }),
    });

    return { ok: true } as const;
  });
}

export async function updateOfferCommand(input: {
  businessId: string;
  offerId: string;
  offer: NormalizedOfferInput;
  actor: OfferWriteActor;
}): Promise<OfferWriteCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const [business, existingOffer] = await Promise.all([
      transaction.business.findUnique({
        where: { id: input.businessId },
        select: { loyaltyMode: true },
      }),
      transaction.offer.findFirst({
        where: { id: input.offerId, businessId: input.businessId },
        select: { id: true },
      }),
    ]);
    if (!business) {
      return { ok: false, reason: "BUSINESS_NOT_FOUND" } as const;
    }
    if (!existingOffer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }
    if (
      !(await hasValidOfferAudience(
        transaction,
        input.businessId,
        business.loyaltyMode,
        input.offer,
      ))
    ) {
      return { ok: false, reason: "INVALID_AUDIENCE" } as const;
    }

    const offer = await transaction.offer.update({
      where: { id: existingOffer.id },
      data: input.offer,
      select: { id: true, name: true },
    });
    await transaction.businessActivity.create({
      data: buildCatalogAuditActivity({
        entity: "OFFER",
        operation: "UPDATE",
        businessId: input.businessId,
        actor: input.actor,
        item: offer,
        activityContext,
      }),
    });

    return { ok: true } as const;
  });
}

export async function setOfferStatusCommand(input: {
  businessId: string;
  offerId: string;
  isActive: boolean;
  actor: OfferWriteActor;
}): Promise<OfferWriteCommandResult> {
  const activityContext = await getActivityRequestContext();

  return prisma.$transaction(async (transaction) => {
    if (
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const [business, existingOffer] = await Promise.all([
      transaction.business.findUnique({
        where: { id: input.businessId },
        select: { loyaltyMode: true },
      }),
      transaction.offer.findFirst({
        where: { id: input.offerId, businessId: input.businessId },
        select: { id: true, eligibility: true, segment: true },
      }),
    ]);
    if (!business) {
      return { ok: false, reason: "BUSINESS_NOT_FOUND" } as const;
    }
    if (!existingOffer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }
    if (
      input.isActive &&
      !(await hasValidOfferAudience(
        transaction,
        input.businessId,
        business.loyaltyMode,
        existingOffer,
      ))
    ) {
      return { ok: false, reason: "INVALID_AUDIENCE" } as const;
    }

    const offer = await transaction.offer.update({
      where: { id: existingOffer.id },
      data: { isActive: input.isActive },
      select: { id: true, name: true },
    });
    await transaction.businessActivity.create({
      data: buildCatalogAuditActivity({
        entity: "OFFER",
        operation: input.isActive ? "ACTIVATE" : "DEACTIVATE",
        businessId: input.businessId,
        actor: input.actor,
        item: offer,
        activityContext,
      }),
    });

    return { ok: true } as const;
  });
}
