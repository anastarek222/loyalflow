import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { hasFeatureEntitlement, isWithinPlanLimit } from "@/lib/entitlements";
import { configurationToPlanLimits } from "@/lib/entitlements-server";
import { normalizeOfferInput } from "@/lib/offers/catalog";
import prisma from "@/lib/prisma";
import { lockBusinessCapacity } from "@/lib/server/business/business-capacity-lock";

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
    | "PLAN_LIMIT";
}>;

export type OfferWriteCommandResult = Readonly<{ ok: true }> | OfferWriteFailure;

/**
 * Authoritative non-financial Offer creation boundary.
 *
 * The caller keeps authentication, tenant authorization, input parsing,
 * presentation preflight, redirects and revalidation. This command owns the
 * persisted subscription/plan checks and the atomic Offer + audit write.
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
      select: { plan: true },
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
      !isWithinPlanLimit(
        business.plan,
        "OFFERS",
        offerCount,
        1,
        planLimits,
      )
    ) {
      return { ok: false, reason: "PLAN_LIMIT" } as const;
    }

    const offer = await transaction.offer.create({
      data: { ...input.offer, businessId: input.businessId },
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "OFFER_CREATED",
        description: `تم إنشاء العرض ${offer.name}`,
        businessId: input.businessId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
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

    const existingOffer = await transaction.offer.findFirst({
      where: { id: input.offerId, businessId: input.businessId },
      select: { id: true },
    });
    if (!existingOffer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    const offer = await transaction.offer.update({
      where: { id: existingOffer.id },
      data: input.offer,
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "OFFER_UPDATED",
        description: `تم تحديث العرض ${offer.name}`,
        businessId: input.businessId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
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

    const existingOffer = await transaction.offer.findFirst({
      where: { id: input.offerId, businessId: input.businessId },
      select: { id: true },
    });
    if (!existingOffer) {
      return { ok: false, reason: "TARGET_NOT_FOUND" } as const;
    }

    const offer = await transaction.offer.update({
      where: { id: existingOffer.id },
      data: { isActive: input.isActive },
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "OFFER_STATUS_CHANGED",
        description: input.isActive
          ? `تم تفعيل العرض ${offer.name}`
          : `تم إيقاف العرض ${offer.name}`,
        businessId: input.businessId,
        ...activityActorFields(input.actor, input.businessId),
        ...activityRequestMetadata(activityContext),
      },
    });

    return { ok: true } as const;
  });
}
