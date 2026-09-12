import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { scheduleIntegrationJobs } from "@/lib/integration-job-scheduler";
import prisma from "@/lib/prisma";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";
import {
  persistCustomerWhatsAppPhone,
  setCustomerWhatsAppConsent,
} from "@/lib/server/integrations/customer-whatsapp-consent-state";
import {
  extractWhatsAppOptOutRequests,
  type WhatsAppOptOutRequest,
} from "@/lib/server/integrations/whatsapp-webhook";

type WhatsAppConsentTarget = Readonly<{
  id: string;
  businessId: string;
  whatsappPhoneE164: string | null;
}>;

async function findConsentTargets(
  transaction: Prisma.TransactionClient,
  request: WhatsAppOptOutRequest,
) {
  const canonicalPhone = `+${request.senderPhone}`;

  return transaction.$queryRaw<WhatsAppConsentTarget[]>`
    SELECT
      customer."id",
      customer."businessId",
      customer."whatsappPhoneE164"
    FROM "Customer" AS customer
    INNER JOIN "BusinessWhatsAppCredential" AS credential
      ON credential."businessId" = customer."businessId"
    WHERE (
        customer."whatsappPhoneE164" = ${canonicalPhone}
        OR (
          customer."whatsappPhoneE164" IS NULL
          AND regexp_replace(customer."phone", '[^0-9]', '', 'g') = ${request.senderPhone}
        )
      )
      AND customer."whatsappOptInAt" IS NOT NULL
      AND customer."whatsappOptedOutAt" IS NULL
      AND credential."phoneNumberId" = ${request.phoneNumberId}
    LIMIT 50
  `;
}

/**
 * Applies explicit customer opt-out messages received from Meta's signed
 * WhatsApp webhook. Consent revocation is scoped to Businesses whose explicit
 * WhatsApp sender credential matches the webhook phone-number ID. Canonical
 * E.164 is the primary identity; exact legacy digit matching is used only for
 * rows that have not yet persisted canonical identity. Historical opt-in is
 * retained while whatsappOptedOutAt becomes the authoritative revocation.
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
      const changedAt = new Date();

      for (const target of targets) {
        if (!target.whatsappPhoneE164) {
          await persistCustomerWhatsAppPhone(transaction, {
            businessId: target.businessId,
            customerId: target.id,
            whatsappPhoneE164: `+${request.senderPhone}`,
          });
        }

        const revoked = await setCustomerWhatsAppConsent(transaction, {
          businessId: target.businessId,
          customerId: target.id,
          consent: "OPT_OUT",
          changedAt,
        });
        if (revoked !== 1) continue;

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
