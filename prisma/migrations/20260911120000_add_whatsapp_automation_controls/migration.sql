CREATE TABLE "BusinessWhatsAppAutomationSetting" (
  "businessId" TEXT NOT NULL,
  "paused" BOOLEAN NOT NULL DEFAULT FALSE,
  "welcomeEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "balanceUpdatedEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "rewardReadyEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "rewardRedeemedEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "newRewardEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "newOfferEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "newRewardMessage" TEXT,
  "newOfferMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BusinessWhatsAppAutomationSetting_pkey"
    PRIMARY KEY ("businessId"),
  CONSTRAINT "BusinessWhatsAppAutomationSetting_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "BusinessWhatsAppAutomationSetting" (
  "businessId",
  "welcomeEnabled",
  "balanceUpdatedEnabled",
  "rewardReadyEnabled"
)
SELECT
  "id",
  NULLIF(BTRIM("whatsappWelcomeMessage"), '') IS NOT NULL,
  NULLIF(BTRIM("whatsappBalanceMessage"), '') IS NOT NULL,
  NULLIF(BTRIM("whatsappRewardMessage"), '') IS NOT NULL
FROM "Business";

ALTER TABLE "BusinessWhatsAppTemplateBinding"
  DROP CONSTRAINT "BusinessWhatsAppTemplateBinding_event_check";

ALTER TABLE "BusinessWhatsAppTemplateBinding"
  ADD CONSTRAINT "BusinessWhatsAppTemplateBinding_event_check"
  CHECK (
    "event" IN (
      'WELCOME',
      'BALANCE_UPDATED',
      'REWARD_READY',
      'REWARD_REDEEMED',
      'NEW_REWARD',
      'NEW_OFFER'
    )
  );
