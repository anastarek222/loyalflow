"use server";

import { publicMembershipRegistrationProblemCodes } from "@loyalflow/contracts/customers/public-membership";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";

import { parseCustomerRegistration } from "@/lib/customers/registration";
import { canApplyPublicReferral } from "@/lib/customers/public-membership-policy";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import prisma from "@/lib/prisma";
import { normalizeReferralCode } from "@/lib/referrals/code";
import { createPublicMembershipCommand } from "@/lib/server/business/public-membership-command";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export async function joinBusinessAction(slug: string, formData: FormData) {
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      isActive: true,
      plan: true,
      subscriptionLifecycleState: true,
    },
  });

  if (!business?.isActive) {
    redirect(
      `/join/${slug}?error=${publicMembershipRegistrationProblemCodes.businessUnavailable}`,
    );
  }

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "EXPAND",
    )
  ) {
    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.businessUnavailable}`,
    );
  }

  const requestHeaders = await headers();
  const clientAddress = getClientAddress(requestHeaders);
  const limit = rateLimit(`public-join:${business.id}:${clientAddress}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!limit.allowed) {
    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.rateLimited}`,
    );
  }

  const parsed = parseCustomerRegistration({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
  });

  if (!parsed) {
    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.invalidInput}`,
    );
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: {
      businessId_phone: {
        businessId: business.id,
        phone: parsed.phone,
      },
    },
    select: { id: true },
  });

  if (existingCustomer) {
    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.duplicateMembership}`,
    );
  }

  const referralCode = canApplyPublicReferral(business.plan)
    ? normalizeReferralCode(formData.get("ref"))
    : null;

  let result: Awaited<ReturnType<typeof createPublicMembershipCommand>>;
  try {
    result = await createPublicMembershipCommand({
      businessId: business.id,
      customer: parsed,
      referralCode,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      redirect(
        `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.duplicateMembership}`,
      );
    }

    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.businessUnavailable}`,
    );
  }

  if (!result.ok) {
    if (result.reason === "DUPLICATE") {
      redirect(
        `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.duplicateMembership}`,
      );
    }
    if (result.reason === "PLAN_LIMIT") {
      redirect(
        `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.customerLimitReached}`,
      );
    }
    redirect(
      `/join/${business.slug}?error=${publicMembershipRegistrationProblemCodes.businessUnavailable}`,
    );
  }

  await syncBusinessToGoogleSheetSafely(business.id);

  revalidatePath(`/businesses/${business.slug}`);
  revalidatePath(`/businesses/${business.slug}/customers`);
  revalidatePath(`/card/${result.customer.publicToken}`);

  redirect(`/card/${result.customer.publicToken}?welcome=1`);
}
