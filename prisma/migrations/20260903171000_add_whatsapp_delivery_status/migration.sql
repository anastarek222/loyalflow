CREATE TYPE "IntegrationProviderDeliveryStatus" AS ENUM ('ACCEPTED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'OTHER');

ALTER TABLE "IntegrationJob"
  ADD COLUMN "providerMessageId" TEXT,
  ADD COLUMN "providerDeliveryStatus" "IntegrationProviderDeliveryStatus",
  ADD COLUMN "providerStatusAt" TIMESTAMP(3);

CREATE INDEX "IntegrationJob_providerMessageId_idx" ON "IntegrationJob"("providerMessageId");
