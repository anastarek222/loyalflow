import type { Prisma } from "@/generated/prisma/client";
import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import { getActivityRequestContext } from "@/lib/activity/request-context";
import { canBusinessPerformSubscriptionOperation } from "@/lib/billing/subscription-entitlement-runtime";
import { isHistoricalSalesAmountCurrencyChangeBlocked } from "@/lib/business/currency-change-safety";
import prisma from "@/lib/prisma";
import { enqueueIntegrationJob } from "@/lib/server/integrations/outbox";

export type UpdateBusinessSettingsCommandInput = Readonly<{
  businessId: string;
  user: Parameters<typeof activityActorFields>[0];
  description: string;
  data: Parameters<typeof prisma.business.update>[0]["data"];
  metadata?: Prisma.InputJsonObject;
  enforceOperateEntitlement?: boolean;
  enqueueSheetsSync?: boolean;
}>;

export type UpdateBusinessSettingsCommandResult =
  | Readonly<{ ok: true; integrationJobId: string | null }>
  | Readonly<{
      ok: false;
      reason: "SUBSCRIPTION_RESTRICTED" | "CURRENCY_LOCKED";
    }>;

/**
 * Authoritative non-financial Business Settings write boundary.
 *
 * Presentation concerns (redirects, path revalidation and post-commit Queue
 * publication) remain with the existing Server Action compatibility layer.
 * The business mutation, audit record and optional durable Sheets job stay
 * atomic in this command transaction.
 */
export async function updateBusinessSettingsCommand(
  input: UpdateBusinessSettingsCommandInput,
): Promise<UpdateBusinessSettingsCommandResult> {
  const activityContext = await getActivityRequestContext();
  const actorFields = activityActorFields(input.user, input.businessId);
  const createdById =
    "createdById" in actorFields ? actorFields.createdById : undefined;
  const actorMetadata =
    "metadata" in actorFields ? actorFields.metadata : undefined;

  return prisma.$transaction(async (transaction) => {
    if (
      input.enforceOperateEntitlement &&
      !(await canBusinessPerformSubscriptionOperation(
        transaction,
        input.businessId,
        "OPERATE",
      ))
    ) {
      return { ok: false, reason: "SUBSCRIPTION_RESTRICTED" } as const;
    }

    const proposedCurrency = input.data.currency;
    if (typeof proposedCurrency === "string" || proposedCurrency === null) {
      const currentBusiness = await transaction.business.findUnique({
        where: { id: input.businessId },
        select: { currency: true },
      });
      if (currentBusiness) {
        const currencyChanged =
          String(currentBusiness.currency ?? "").trim().toUpperCase() !==
          String(proposedCurrency ?? "").trim().toUpperCase();
        if (currencyChanged) {
          const historicalSalesAmount = await transaction.loyaltyTransaction.findFirst({
            where: {
              businessId: input.businessId,
              sourceLoyaltyMode: "SALES_AMOUNT",
              saleAmount: { not: null },
            },
            select: { id: true },
          });
          if (
            isHistoricalSalesAmountCurrencyChangeBlocked({
              currentCurrency: currentBusiness.currency,
              proposedCurrency,
              hasHistoricalSalesAmount: Boolean(historicalSalesAmount),
            })
          ) {
            return { ok: false, reason: "CURRENCY_LOCKED" } as const;
          }
        }
      }
    }

    await transaction.business.update({
      where: { id: input.businessId },
      data: input.data,
    });

    const activity = await transaction.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: input.description,
        businessId: input.businessId,
        ...(createdById ? { createdById } : {}),
        ...(actorMetadata || input.metadata
          ? {
              metadata: {
                ...(actorMetadata ?? {}),
                ...(input.metadata ?? {}),
              },
            }
          : {}),
        ...activityRequestMetadata(activityContext),
      },
      select: { id: true },
    });

    const integrationJob = input.enqueueSheetsSync
      ? await enqueueIntegrationJob(transaction, {
          businessId: input.businessId,
          kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
          idempotencyKey: `business-settings:${activity.id}`,
        })
      : null;

    return {
      ok: true,
      integrationJobId: integrationJob?.id ?? null,
    } as const;
  });
}
