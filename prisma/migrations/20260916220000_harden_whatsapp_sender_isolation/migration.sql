-- A WhatsApp sender may belong to only one LoyalFlow Business. This keeps
-- inbound consent and provider events on a single tenant boundary.
CREATE UNIQUE INDEX "BusinessWhatsAppCredential_phoneNumberId_key"
  ON "BusinessWhatsAppCredential"("phoneNumberId");

-- Persist the exact provider sender used for every accepted outbound message.
-- Delivery webhooks must match both the Meta message id and that sender id.
ALTER TABLE "IntegrationJob"
  ADD COLUMN "providerPhoneNumberId" VARCHAR(80),
  ADD COLUMN "providerWabaId" VARCHAR(80);

CREATE UNIQUE INDEX "IntegrationJob_providerPhoneNumberId_providerMessageId_key"
  ON "IntegrationJob"("providerPhoneNumberId", "providerMessageId");
