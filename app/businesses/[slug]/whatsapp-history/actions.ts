"use server";

import { auth } from "@/auth";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { scheduleIntegrationJob } from "@/lib/integration-job-scheduler";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  enqueueAutomaticCustomerMessageResendJob,
  enqueueManualCustomerMessageJob,
  isCustomerMessagePayload,
  isManualCustomerMessageEvent,
} from "@/lib/server/integrations/customer-messaging";
import { getWhatsAppRecoveryDecision } from "@/lib/server/integrations/whatsapp-recovery";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const jobIdSchema = z.string().trim().min(1).max(200);
const requestIdSchema = z.string().uuid();

function canRecoverWhatsAppMessages(
  user: { role: string; businessId: string | null | undefined },
  businessId: string,
) {
  return canPerform(
    user as Parameters<typeof canPerform>[0],
    businessId,
    "CUSTOMERS_EDIT",
  );
}

async function recoverableBusiness(slug: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
    },
  });
  if (!business) redirect("/businesses");
  if (!canRecoverWhatsAppMessages(session.user, business.id)) {
    redirect(`/businesses/${business.slug}/customers`);
  }
  if (
    !(await canBusinessPerformSubscriptionOperation(
      prisma,
      business.id,
      "OPERATE",
    ))
  ) {
    redirect(
      `/businesses/${business.slug}/whatsapp-history?recovery=subscription-restricted`,
    );
  }
  return business;
}

function historyPath(slug: string, status: string) {
  return `/businesses/${slug}/whatsapp-history?recovery=${status}`;
}

/**
 * Retry is the same logical delivery attempt: it revives the exact durable job,
 * retaining payload, idempotency key and attempt history. A job that Meta has
 * already accepted is never eligible for Retry because that could duplicate a
 * customer message. Use Resend for an intentional new delivery instead.
 */
export async function retryWhatsAppDeliveryAction(
  slug: string,
  formData: FormData,
) {
  const business = await recoverableBusiness(slug);
  const jobId = jobIdSchema.safeParse(formData.get("jobId"));
  if (!jobId.success) redirect(historyPath(business.slug, "invalid"));

  const job = await prisma.integrationJob.findFirst({
    where: {
      id: jobId.data,
      businessId: business.id,
      kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
    },
    select: {
      id: true,
      status: true,
      providerMessageId: true,
      providerDeliveryStatus: true,
      lastErrorCode: true,
      payload: true,
    },
  });
  if (!job) redirect(historyPath(business.slug, "not-found"));
  if (
    !["FAILED", "DEAD"].includes(job.status) ||
    job.providerMessageId ||
    job.providerDeliveryStatus
  ) {
    redirect(historyPath(business.slug, "retry-unsafe"));
  }

  const recoveryDecision = getWhatsAppRecoveryDecision(job.lastErrorCode);
  if (!recoveryDecision.retryAllowed) {
    redirect(historyPath(business.slug, "retry-not-allowed"));
  }
  if (!isCustomerMessagePayload(job.payload)) {
    redirect(historyPath(business.slug, "retry-not-allowed"));
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: job.payload.customerId,
      businessId: business.id,
      isActive: true,
      whatsappPhoneE164: { not: null },
      whatsappOptInAt: { not: null },
      whatsappOptedOutAt: null,
    },
    select: {
      phone: true,
      whatsappPhoneE164: true,
    },
  });
  if (
    !customer ||
    !customer.whatsappPhoneE164 ||
    customer.whatsappPhoneE164 !== customer.phone
  ) {
    redirect(historyPath(business.slug, "retry-ineligible"));
  }

  const revived = await prisma.integrationJob.updateMany({
    where: {
      id: job.id,
      businessId: business.id,
      kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
      status: { in: ["FAILED", "DEAD"] },
      providerMessageId: null,
      providerDeliveryStatus: null,
      lastErrorCode: job.lastErrorCode,
    },
    data: {
      status: "PENDING",
      availableAt: new Date(),
      leaseOwner: null,
      leaseExpiresAt: null,
      completedAt: null,
      lastErrorCode: null,
    },
  });
  if (revived.count !== 1) {
    redirect(historyPath(business.slug, "retry-conflict"));
  }

  scheduleIntegrationJob(job.id);
  revalidatePath(`/businesses/${business.slug}/whatsapp-history`);
  redirect(historyPath(business.slug, "retry-scheduled"));
}

/**
 * Resend creates a new delivery job from the existing immutable message intent.
 * It never replays the loyalty/reward mutation that originally produced the
 * notification. The page supplies a per-render UUID so accidental double-submit
 * resolves to one idempotency key while a later intentional resend gets a new key.
 */
export async function resendWhatsAppDeliveryAction(
  slug: string,
  formData: FormData,
) {
  const business = await recoverableBusiness(slug);
  const parsed = z
    .object({
      jobId: jobIdSchema,
      requestId: requestIdSchema,
    })
    .safeParse({
      jobId: formData.get("jobId"),
      requestId: formData.get("requestId"),
    });
  if (!parsed.success) redirect(historyPath(business.slug, "invalid"));

  const sourceJob = await prisma.integrationJob.findFirst({
    where: {
      id: parsed.data.jobId,
      businessId: business.id,
      kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
    },
    select: {
      id: true,
      status: true,
      payload: true,
    },
  });
  if (!sourceJob) redirect(historyPath(business.slug, "not-found"));
  if (["PENDING", "PROCESSING"].includes(sourceJob.status)) {
    redirect(historyPath(business.slug, "resend-in-flight"));
  }
  if (!isCustomerMessagePayload(sourceJob.payload)) {
    redirect(historyPath(business.slug, "invalid-payload"));
  }

  const payload = sourceJob.payload;
  const resendJob = await prisma.$transaction((transaction) => {
    if (
      payload.deliveryMode === "MANUAL" &&
      isManualCustomerMessageEvent(payload.event)
    ) {
      return enqueueManualCustomerMessageJob(transaction, {
        businessId: business.id,
        customerId: payload.customerId,
        event: payload.event,
        requestId: `resend-${parsed.data.requestId}`,
        ...(payload.balance === undefined ? {} : { balance: payload.balance }),
        ...(payload.rewardName ? { rewardName: payload.rewardName } : {}),
      });
    }

    return enqueueAutomaticCustomerMessageResendJob(transaction, {
      businessId: business.id,
      sourceJobId: sourceJob.id,
      requestId: parsed.data.requestId,
      payload,
    });
  });
  if (!resendJob) {
    redirect(historyPath(business.slug, "resend-ineligible"));
  }

  scheduleIntegrationJob(resendJob.id);
  revalidatePath(`/businesses/${business.slug}/whatsapp-history`);
  redirect(historyPath(business.slug, "resend-scheduled"));
}
