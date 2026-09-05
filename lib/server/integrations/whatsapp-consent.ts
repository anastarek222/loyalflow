import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { scheduleIntegrationJobs } from "@/lib/integration-job-scheduler";
import prisma from "@/lib/prisma";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";
import {
  extractWhatsAppOptOutRequests,
  type WhatsAppOptOutRequest,
} from "@/lib/server/integrations/whatsapp-webhook";

type WhatsAppConsentTarget = Readonly<{
  id: string;
  businessId: string;
}>;

async function findConsentTargets(
  transaction: Prisma.TransactionClient,
  request: WhatsAppOptOutRequest,
) {
  const fallbackPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() ?? "";

  return transaction.$queryRaw<WhatsAppConsentTarget[]>`
    SELECT
      customer."id",
      customer."businessId"
    FROM "Customer" AS customer
    LEFT JOIN "BusinessWhatsAppCredential" AS credential
      ON credential."businessId" = customer."businessId"
    WHERE regexp_replace(customer."phone", '[^0-9]', '', 'g') = ${request.senderPhone}
      AND customer."whatsappOptInAt" IS NOT NULL
      AND (
        credential."phoneNumberId" = ${request.phoneNumberId}
        OR (
          credential."businessId" IS NULL
          AND ${fallbackPhoneNumberId} <> ''
          AND ${request.phoneNumberId} = ${fallbackPhoneNumberId}
        )
      )
    LIMIT 50
  `;
}

/**
 * Applies explicit customer opt-out messages received from Meta's signed
 * WhatsApp webhook. Consent is tenant-scoped when a Business has its own sender
 * credential. Businesses using the shared fallback sender are treated as one
 * sender identity, so STOP revokes all matching opted-in Tanee memberships for
 * that customer phone on that sender.
 *
 * The worker already re-checks whatsappOptInAt immediately before every send,
 * so clearing consent here also blocks previously queued notifications.
 */
export async function revokeWhatsAppConsentFromWebhook(payload: unknown) {
  const requests = extractWhatsAppOptOutRequests(payload);
  if (requests.length === 0) return 0;

  const integrationJobIds: string[] = [];
  let revokedCount = 0;

  for (const request of requests) {
    const result = await prisma.$transaction(async (transaction) => {
      const targets = await findConsentTargets(transaction, request);
      let transactionRevokedCount = 0;
      const transactionJobIds: string[] = [];

      for (const target of targets) {
        const revoked = await transaction.customer.updateMany({
          where: {
            id: target.id,
            businessId: target.businessId,
            whatsappOptInAt: { not: null },
          },
          data: { whatsappOptInAt: null },
        });
        if (revoked.count !== 1) continue;

        const activity = await transaction.businessActivity.create({
          data: {
            type: "CUSTOMER_UPDATED",
            description: "تم سحب موافقة رسائل واتساب بناءً على طلب العميل",
            businessId: target.businessId,
            customerId: target.id,
            metadata: {
              source: "WHATSAPP_INBOUND_OPTOUT",
              providerMessageId: request.providerMessageId,
            },
          },
          select: { id: true },
        });
        const integrationJob = await enqueueIntegrationJob(transaction, {
          businessId: target.businessId,
          kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
          idempotencyKey: `whatsapp-consent-optout:${activity.id}`,
        });
        transactionJobIds.push(integrationJob.id);
        transactionRevokedCount += 1;
      }

      return {
        revokedCount: transactionRevokedCount,
        integrationJobIds: transactionJobIds,
      };
    });

    revokedCount += result.revokedCount;
    integrationJobIds.push(...result.integrationJobIds);
  }

  if (integrationJobIds.length > 0) {
    scheduleIntegrationJobs(integrationJobIds);
  }

  return revokedCount;
}
