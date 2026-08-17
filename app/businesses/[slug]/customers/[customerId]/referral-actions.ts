"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { canUseCustomerReferrals } from "@/lib/customers/feature-access";
import prisma from "@/lib/prisma";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import { ensureCustomerReferralCodeCommand } from "@/lib/server/business/customer-referral-code-command";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getReferralContext(slug: string, customerId: string) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) {
    redirect(`/businesses/${slug}/customers`);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      plan: true,
      subscriptionLifecycleState: true,
    },
  });
  if (!business) {
    redirect("/businesses");
  }

  if (!canUseCustomerReferrals(session.user, business.id, business.plan)) {
    redirect(`/businesses/${slug}/customers/${customerId}`);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: parsedCustomerId.data,
      businessId: business.id,
    },
    select: {
      id: true,
      publicToken: true,
    },
  });
  if (!customer) {
    redirect(`/businesses/${slug}/customers`);
  }

  return { business, customer };
}

function revalidateReferralSurfaces(
  slug: string,
  customerId: string,
  publicToken: string,
) {
  revalidatePath(`/businesses/${slug}/customers/${customerId}`);
  revalidatePath(`/businesses/${slug}/scan/customer/${customerId}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/reports`);
  revalidatePath(`/businesses/${slug}/activity`);
  revalidatePath(`/card/${publicToken}`);
  revalidatePath("/dashboard");
}

export async function createCustomerReferralCodeCommandAction(
  slug: string,
  customerId: string,
) {
  const { business, customer } = await getReferralContext(slug, customerId);

  const existing = await prisma.customerReferralCode.findUnique({
    where: {
      businessId_customerId: {
        businessId: business.id,
        customerId: customer.id,
      },
    },
    select: { id: true },
  });

  if (
    !existing &&
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "EXPAND",
    )
  ) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`,
    );
  }

  const result = await ensureCustomerReferralCodeCommand({
    businessId: business.id,
    customerId: customer.id,
  });

  if (!result.ok) {
    if (result.reason === "SUBSCRIPTION_RESTRICTED") {
      redirect(
        `/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`,
      );
    }
    if (result.reason === "CREATE_FAILED") {
      redirect(`/businesses/${slug}/customers/${customer.id}?error=referral`);
    }
    redirect(`/businesses/${slug}/customers/${customer.id}`);
  }

  revalidateReferralSurfaces(slug, customer.id, customer.publicToken);
  redirect(
    `/businesses/${slug}/customers/${customer.id}?success=referral-link`,
  );
}
