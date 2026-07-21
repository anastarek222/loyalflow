"use server";

import { auth } from "@/auth";
import { offerInputSchema, normalizeOfferInput } from "@/lib/offers/catalog";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
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
  return business;
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
  const business = await getOfferManagementContext(slug);
  const parsed = parseOfferForm(formData);
  if (!parsed.success) redirect(`/businesses/${business.slug}/offers?error=invalid`);

  await prisma.offer.create({
    data: { ...normalizeOfferInput(parsed.data), businessId: business.id },
  });
  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=created`);
}

export async function updateOfferAction(
  slug: string,
  offerId: string,
  formData: FormData
) {
  const business = await getOfferManagementContext(slug);
  const parsed = parseOfferForm(formData);
  if (!parsed.success) redirect(`/businesses/${business.slug}/offers?error=invalid`);

  const result = await prisma.offer.updateMany({
    where: { id: offerId, businessId: business.id },
    data: normalizeOfferInput(parsed.data),
  });
  if (result.count !== 1) redirect(`/businesses/${business.slug}/offers?error=not-found`);

  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=updated`);
}

export async function toggleOfferStatusAction(
  slug: string,
  offerId: string,
  isActive: boolean
) {
  const business = await getOfferManagementContext(slug);
  const result = await prisma.offer.updateMany({
    where: { id: offerId, businessId: business.id },
    data: { isActive },
  });
  if (result.count !== 1) redirect(`/businesses/${business.slug}/offers?error=not-found`);

  revalidateOfferPaths(business.slug);
  redirect(`/businesses/${business.slug}/offers?success=updated`);
}
