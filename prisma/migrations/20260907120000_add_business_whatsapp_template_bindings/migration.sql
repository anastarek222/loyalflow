ALTER TABLE "BusinessWhatsAppCredential"
  ADD COLUMN "wabaId" VARCHAR(80);

CREATE TABLE "BusinessWhatsAppTemplateBinding" (
  "businessId" TEXT NOT NULL,
  "wabaId" VARCHAR(80),
  "event" VARCHAR(32) NOT NULL,
  "language" VARCHAR(8) NOT NULL,
  "templateName" VARCHAR(512) NOT NULL,
  "templateLanguageCode" VARCHAR(32) NOT NULL,
  "contentSha256" CHAR(64) NOT NULL,
  "approvalStatus" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  "providerTemplateId" VARCHAR(128),
  "providerStatusUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "BusinessWhatsAppTemplateBinding_pkey"
    PRIMARY KEY ("businessId", "event", "language"),
  CONSTRAINT "BusinessWhatsAppTemplateBinding_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BusinessWhatsAppTemplateBinding_event_check"
    CHECK ("event" IN ('WELCOME', 'BALANCE_UPDATED', 'REWARD_READY')),
  CONSTRAINT "BusinessWhatsAppTemplateBinding_language_check"
    CHECK ("language" IN ('AR', 'EN')),
  CONSTRAINT "BusinessWhatsAppTemplateBinding_approval_check"
    CHECK ("approvalStatus" IN ('PENDING', 'APPROVED', 'REJECTED', 'UNKNOWN')),
  CONSTRAINT "BusinessWhatsAppTemplateBinding_content_hash_check"
    CHECK ("contentSha256" ~ '^[0-9a-f]{64}$')
);
