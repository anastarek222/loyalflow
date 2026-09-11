"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { scheduleIntegrationJob } from "@/lib/integration-job-scheduler";
import { canAccessBusiness, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getRewardAvailability } from "@/lib/rewards/availability";
import {
  enqueueManualCustomerMessageJob,
  MANUAL_CUSTOMER_MESSAGE_EVENTS,
  type ManualCustomerMessageEvent,
} from "@/lib/server/integrations/customer-messaging";
import { getBusinessWhatsAppManualReadiness } from "@/lib/server/integrations/whatsapp-manual-readiness";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const manualEventSchema = z.enum(MANUAL_CUSTOMER_MESSAGE_EVENTS);
const requestIdSchema = z.string().uuid();

function customerPath(slug: string, customerId: string, result: string) {
  return `/businesses/${slug}/customers/${customerId}?success=${result}`;
}

export async function sendManualCustomerWhatsAppAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsed = z
    .object({
      event: manualEventSchema,
      requestId: requestIdSchema,
    })
    .safeParse({
      event: formData.get("event"),
      requestId: formData.get("requestId"),
    });
  if (!parsed.success)
    redirect(customerPath(slug, customerId, "whatsapp-invalid"));

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      subscriptionLifecycleState: true,
      rewardThreshold: true,
      rewardName: true,
      cardDefaultLanguage: true,
      whatsappWelcomeMessage: true,
      whatsappBalanceMessage: true,
      whatsappRewardMessage: true,
      whatsappRedeemedMessage: true,
      rewards: {
        where: { isActive: true },
        select: { id: true, name: true, cost: true, isActive: true },
      },
    },
  });
  if (!business) redirect("/businesses");
  if (
    !canAccessBusiness(session.user, business.id) ||
    !canPerform(session.user, business.id, "CUSTOMERS_EDIT")
  ) {
    redirect(`/businesses/${business.slug}/customers/${customerId}`);
  }
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      customerPath(
        business.slug,
        customerId,
        "whatsapp-subscription-restricted",
      ),
    );
  }

  const manualReadiness = await getBusinessWhatsAppManualReadiness(prisma, {
    businessId: business.id,
    language: business.cardDefaultLanguage,
    messages: {
      whatsappWelcomeMessage: business.whatsappWelcomeMessage,
      whatsappBalanceMessage: business.whatsappBalanceMessage,
      whatsappRewardMessage: business.whatsappRewardMessage,
      whatsappRedeemedMessage: business.whatsappRedeemedMessage,
      newRewardMessage: null,
      newOfferMessage: null,
    },
  });
  if (!manualReadiness.isEventReady(parsed.data.event)) {
    redirect(customerPath(business.slug, customerId, "whatsapp-not-ready"));
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: business.id },
    select: { id: true, balance: true, isActive: true },
  });
  if (!customer) redirect(`/businesses/${business.slug}/customers`);

  let rewardName: string | undefined;
  if (parsed.data.event === "REWARD_READY") {
    const availability = getRewardAvailability({
      customerActive: customer.isActive,
      balance: customer.balance,
      rewardThreshold: business.rewardThreshold,
      fallbackReward: {
        name: business.rewardName,
        cost: business.rewardThreshold,
      },
      catalogueRewards: business.rewards,
    });
    if (!availability.rewardReady) {
      redirect(
        customerPath(business.slug, customer.id, "whatsapp-reward-not-ready"),
      );
    }
    rewardName =
      availability.affordableRewards[0]?.name ??
      availability.defaultReward.name;
  }

  const job = await prisma.$transaction((transaction) =>
    enqueueManualCustomerMessageJob(transaction, {
      businessId: business.id,
      customerId: customer.id,
      event: parsed.data.event as ManualCustomerMessageEvent,
      requestId: parsed.data.requestId,
      balance: customer.balance,
      ...(rewardName ? { rewardName } : {}),
    }),
  );
  if (!job) {
    redirect(customerPath(business.slug, customer.id, "whatsapp-ineligible"));
  }

  scheduleIntegrationJob(job.id);
  revalidatePath(`/businesses/${business.slug}/customers/${customer.id}`);
  revalidatePath(`/businesses/${business.slug}/whatsapp-history`);
  redirect(customerPath(business.slug, customer.id, "whatsapp-scheduled"));
}
