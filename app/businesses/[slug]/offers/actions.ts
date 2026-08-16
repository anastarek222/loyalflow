"use server";

import { auth } from "@/auth";
import { hasFeatureEntitlement, isWithinPlanLimit } from "@/lib/entitlements";
import { getEffectivePlanLimits } from "@/lib/entitlements-server";
import { offerInputSchema, normalizeOfferInput } from "@/lib/offers/catalog";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  createOfferCommand,
  setOfferStatusCommand,
  updateOfferCommand,
  type OfferWriteCommandResult,
} from "@/lib/server/business/offer-write-command";
import {
  actionBooleanSchema,
  opaqueIdSchema,
} from "@/lib/validation/action-input";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getOfferManagementContext(slug: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      plan: true,
      subscriptionLifecycleState: true,
    },
  });
  if (!business || !canManageBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }
  return { business, session };
}

function revalidateOfferPaths(slug: string) {
  revalidatePath(`/businesses/${slug}/offers`);
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/card`);
}

function parseOfferForm(formData: FormData) {
  return offerInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    validFrom: formData.get("validFrom") || undefined,
    validUntil: formData.get("validUntil") || undefined,
    eligibility: formData.get("eligibility"),
    segment: formData.get("segment") || undefined,
  });
}

function offerCommandError(result: OfferWriteCommandResult) {
  if (result.ok) return null;
  switch (result.reason) {
    case "SUBSCRIPTION_RESTRICTED":
      return "subscription-restricted";
    case "PLAN_FEATURE":
      return "plan-feature";
    case "PLAN_LIMIT":
      return "plan-limit";
    case "BUSINESS_NOT_FOUND":
    case "TARGET_NOT_FOUND":
      return "not-found";
  }
}

export async function createOfferAction(slug: string, formData: FormData) {
  const { business, session } = await getOfferManagementContext(slug);
  const parsed = parseOfferForm(formData);
  if (!parsed.success) {
    redirect(`/businesses/${business.slug}/offers?error=invalid`);
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "EXPAND",
    )
  ) {
    redirect(
      `/businesses/${business.slug}/offers?error=subscription-restricted`,
    );
  }
  if (!hasFeatureEntitlement(business.plan, "OFFERS")) {
    redirect(`/businesses/${business.slug}/offers?error=plan-feature`);
  }
  const [offerCount, planLimits] = await Promise.all([
    prisma.offer.count({ where: { businessId: business.id } }),
    getEffectivePlanLimits(business.plan),
  ]);
  if (!isWithinPlanLimit(business.plan, "OFFERS", offerCount, 1, planLimits)) {
    redirect(`/businesses/${business.slug}/offers?error=plan-limit`);
  }

  const result = await createOfferCommand({
    businessId: business.id,
    offer: normalizeOfferInput(parsed.data),
    actor: session.user,
  });
  const error = offerCommandError(result);
  if (error) {
    redirect(`/businesses/${business.slug}/offers?error=${error}`);
  }

  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=created`);
}

export async function updateOfferAction(
  slug: string,
  offerId: string,
  formData: FormData,
) {
  const { business, session } = await getOfferManagementContext(slug);
  const parsedOfferId = opaqueIdSchema.safeParse(offerId);
  const parsed = parseOfferForm(formData);
  if (!parsed.success || !parsedOfferId.success) {
    redirect(`/businesses/${business.slug}/offers?error=invalid`);
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      `/businesses/${business.slug}/offers?error=subscription-restricted`,
    );
  }

  const existingOffer = await prisma.offer.findFirst({
    where: { id: parsedOfferId.data, businessId: business.id },
    select: { id: true },
  });
  if (!existingOffer) {
    redirect(`/businesses/${business.slug}/offers?error=not-found`);
  }

  const result = await updateOfferCommand({
    businessId: business.id,
    offerId: existingOffer.id,
    offer: normalizeOfferInput(parsed.data),
    actor: session.user,
  });
  const error = offerCommandError(result);
  if (error) {
    redirect(`/businesses/${business.slug}/offers?error=${error}`);
  }

  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=updated`);
}

export async function toggleOfferStatusAction(
  slug: string,
  offerId: string,
  isActive: boolean,
) {
  const { business, session } = await getOfferManagementContext(slug);
  const parsedOfferId = opaqueIdSchema.safeParse(offerId);
  const parsedStatus = actionBooleanSchema.safeParse(isActive);

  if (!parsedOfferId.success || !parsedStatus.success) {
    redirect(`/businesses/${business.slug}/offers?error=invalid`);
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      `/businesses/${business.slug}/offers?error=subscription-restricted`,
    );
  }

  const existingOffer = await prisma.offer.findFirst({
    where: { id: parsedOfferId.data, businessId: business.id },
    select: { id: true },
  });
  if (!existingOffer) {
    redirect(`/businesses/${business.slug}/offers?error=not-found`);
  }

  const result = await setOfferStatusCommand({
    businessId: business.id,
    offerId: existingOffer.id,
    isActive: parsedStatus.data,
    actor: session.user,
  });
  const error = offerCommandError(result);
  if (error) {
    redirect(`/businesses/${business.slug}/offers?error=${error}`);
  }

  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=updated`);
}
