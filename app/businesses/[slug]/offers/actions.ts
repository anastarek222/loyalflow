"use server";

import { auth } from "@/auth";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { offerInputSchema, normalizeOfferInput } from "@/lib/offers/catalog";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { actionBooleanSchema, opaqueIdSchema } from "@/lib/validation/action-input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getOfferManagementContext(slug: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true },
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

export async function createOfferAction(slug: string, formData: FormData) {
  const { business, session } = await getOfferManagementContext(slug);
  const parsed = parseOfferForm(formData);
  if (!parsed.success) redirect(`/businesses/${business.slug}/offers?error=invalid`);

  const activityContext = await getActivityRequestContext();
  await prisma.$transaction(async (transaction) => {
    const offer = await transaction.offer.create({
      data: { ...normalizeOfferInput(parsed.data), businessId: business.id },
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "OFFER_CREATED",
        description: `تم إنشاء العرض ${offer.name}`,
        businessId: business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    });
  });
  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=created`);
}

export async function updateOfferAction(
  slug: string,
  offerId: string,
  formData: FormData
) {
  const { business, session } = await getOfferManagementContext(slug);
  const parsedOfferId = opaqueIdSchema.safeParse(offerId);
  const parsed = parseOfferForm(formData);
  if (!parsed.success || !parsedOfferId.success) redirect(`/businesses/${business.slug}/offers?error=invalid`);

  const existingOffer = await prisma.offer.findFirst({
    where: { id: parsedOfferId.data, businessId: business.id },
    select: { id: true },
  });
  if (!existingOffer) redirect(`/businesses/${business.slug}/offers?error=not-found`);

  const activityContext = await getActivityRequestContext();
  await prisma.$transaction(async (transaction) => {
    const offer = await transaction.offer.update({
      where: { id: existingOffer.id },
      data: normalizeOfferInput(parsed.data),
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "OFFER_UPDATED",
        description: `تم تحديث العرض ${offer.name}`,
        businessId: business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    });
  });

  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=updated`);
}

export async function toggleOfferStatusAction(
  slug: string,
  offerId: string,
  isActive: boolean
) {
  const { business, session } = await getOfferManagementContext(slug);
  const parsedOfferId = opaqueIdSchema.safeParse(offerId);
  const parsedStatus = actionBooleanSchema.safeParse(isActive);

  if (!parsedOfferId.success || !parsedStatus.success) {
    redirect(`/businesses/${business.slug}/offers?error=invalid`);
  }

  const existingOffer = await prisma.offer.findFirst({
    where: { id: parsedOfferId.data, businessId: business.id },
    select: { id: true },
  });
  if (!existingOffer) redirect(`/businesses/${business.slug}/offers?error=not-found`);

  const activityContext = await getActivityRequestContext();
  await prisma.$transaction(async (transaction) => {
    const offer = await transaction.offer.update({
      where: { id: existingOffer.id },
      data: { isActive: parsedStatus.data },
      select: { name: true },
    });
    await transaction.businessActivity.create({
      data: {
        type: "OFFER_STATUS_CHANGED",
        description: parsedStatus.data
          ? `تم تفعيل العرض ${offer.name}`
          : `تم إيقاف العرض ${offer.name}`,
        businessId: business.id,
        ...activityActorFields(session.user, business.id),
        ...activityRequestMetadata(activityContext),
      },
    });
  });

  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=updated`);
}
