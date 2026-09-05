ALTER TYPE "IntegrationJobKind" ADD VALUE 'WHATSAPP_CUSTOMER_NOTIFICATION';

ALTER TABLE "Business"
ADD COLUMN "whatsappRedeemedMessage" TEXT;

ALTER TABLE "Customer"
ADD COLUMN "whatsappOptInAt" TIMESTAMP(3);

ALTER TABLE "IntegrationJob"
ADD COLUMN "payload" JSONB;
