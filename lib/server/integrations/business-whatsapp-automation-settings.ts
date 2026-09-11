import type { Prisma } from "@/generated/prisma/client";
import type {
  BusinessWhatsAppAutomationControls,
  WhatsAppAutomationEvent,
} from "@/lib/server/integrations/whatsapp-automation-policy";
import { isWhatsAppAutomationEventEnabled } from "@/lib/server/integrations/whatsapp-automation-policy";

type AutomationSettingsClient = Pick<
  Prisma.TransactionClient,
  "$queryRaw" | "$executeRaw"
>;

export type BusinessWhatsAppAutomationSettings =
  BusinessWhatsAppAutomationControls &
    Readonly<{
      businessId: string;
      newRewardMessage: string | null;
      newOfferMessage: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }>;

export async function getBusinessWhatsAppAutomationSettings(
  client: AutomationSettingsClient,
  businessId: string,
): Promise<BusinessWhatsAppAutomationSettings | null> {
  const rows = await client.$queryRaw<BusinessWhatsAppAutomationSettings[]>`
    SELECT
      b."id" AS "businessId",
      COALESCE(s."paused", FALSE) AS "paused",
      COALESCE(
        s."welcomeEnabled",
        NULLIF(BTRIM(b."whatsappWelcomeMessage"), '') IS NOT NULL
      ) AS "welcomeEnabled",
      COALESCE(
        s."balanceUpdatedEnabled",
        NULLIF(BTRIM(b."whatsappBalanceMessage"), '') IS NOT NULL
      ) AS "balanceUpdatedEnabled",
      COALESCE(
        s."rewardReadyEnabled",
        NULLIF(BTRIM(b."whatsappRewardMessage"), '') IS NOT NULL
      ) AS "rewardReadyEnabled",
      COALESCE(s."rewardRedeemedEnabled", FALSE) AS "rewardRedeemedEnabled",
      COALESCE(s."newRewardEnabled", FALSE) AS "newRewardEnabled",
      COALESCE(s."newOfferEnabled", FALSE) AS "newOfferEnabled",
      s."newRewardMessage" AS "newRewardMessage",
      s."newOfferMessage" AS "newOfferMessage",
      s."createdAt" AS "createdAt",
      s."updatedAt" AS "updatedAt"
    FROM "Business" b
    LEFT JOIN "BusinessWhatsAppAutomationSetting" s
      ON s."businessId" = b."id"
    WHERE b."id" = ${businessId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function isBusinessWhatsAppAutomationEnabled(
  client: AutomationSettingsClient,
  input: Readonly<{
    businessId: string;
    event: WhatsAppAutomationEvent;
  }>,
) {
  const settings = await getBusinessWhatsAppAutomationSettings(
    client,
    input.businessId,
  );
  return settings
    ? isWhatsAppAutomationEventEnabled(settings, input.event)
    : false;
}

export async function upsertBusinessWhatsAppAutomationSettings(
  client: AutomationSettingsClient,
  input: Readonly<{
    businessId: string;
    paused: boolean;
    welcomeEnabled: boolean;
    balanceUpdatedEnabled: boolean;
    rewardReadyEnabled: boolean;
    rewardRedeemedEnabled: boolean;
    newRewardEnabled: boolean;
    newOfferEnabled: boolean;
    newRewardMessage: string | null;
    newOfferMessage: string | null;
  }>,
) {
  await client.$executeRaw`
    INSERT INTO "BusinessWhatsAppAutomationSetting" (
      "businessId",
      "paused",
      "welcomeEnabled",
      "balanceUpdatedEnabled",
      "rewardReadyEnabled",
      "rewardRedeemedEnabled",
      "newRewardEnabled",
      "newOfferEnabled",
      "newRewardMessage",
      "newOfferMessage",
      "createdAt",
      "updatedAt"
    ) VALUES (
      ${input.businessId},
      ${input.paused},
      ${input.welcomeEnabled},
      ${input.balanceUpdatedEnabled},
      ${input.rewardReadyEnabled},
      ${input.rewardRedeemedEnabled},
      ${input.newRewardEnabled},
      ${input.newOfferEnabled},
      ${input.newRewardMessage},
      ${input.newOfferMessage},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("businessId") DO UPDATE SET
      "paused" = EXCLUDED."paused",
      "welcomeEnabled" = EXCLUDED."welcomeEnabled",
      "balanceUpdatedEnabled" = EXCLUDED."balanceUpdatedEnabled",
      "rewardReadyEnabled" = EXCLUDED."rewardReadyEnabled",
      "rewardRedeemedEnabled" = EXCLUDED."rewardRedeemedEnabled",
      "newRewardEnabled" = EXCLUDED."newRewardEnabled",
      "newOfferEnabled" = EXCLUDED."newOfferEnabled",
      "newRewardMessage" = EXCLUDED."newRewardMessage",
      "newOfferMessage" = EXCLUDED."newOfferMessage",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}
