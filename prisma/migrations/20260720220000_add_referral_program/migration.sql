-- Additive referral attribution only. No existing customer, balance, loyalty
-- transaction, or reward is modified by this migration.
CREATE TYPE "ReferralStatus" AS ENUM ('RECORDED');

CREATE TABLE "CustomerReferralCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerReferralCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'RECORDED',
    "businessId" TEXT NOT NULL,
    "referrerCustomerId" TEXT NOT NULL,
    "referredCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerReferralCode_businessId_customerId_key"
    ON "CustomerReferralCode"("businessId", "customerId");
CREATE UNIQUE INDEX "CustomerReferralCode_businessId_code_key"
    ON "CustomerReferralCode"("businessId", "code");
CREATE INDEX "CustomerReferralCode_businessId_isActive_idx"
    ON "CustomerReferralCode"("businessId", "isActive");
CREATE UNIQUE INDEX "Referral_businessId_referredCustomerId_key"
    ON "Referral"("businessId", "referredCustomerId");
CREATE INDEX "Referral_businessId_referrerCustomerId_createdAt_idx"
    ON "Referral"("businessId", "referrerCustomerId", "createdAt");

ALTER TABLE "CustomerReferralCode"
    ADD CONSTRAINT "CustomerReferralCode_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerReferralCode"
    ADD CONSTRAINT "CustomerReferralCode_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral"
    ADD CONSTRAINT "Referral_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral"
    ADD CONSTRAINT "Referral_referrerCustomerId_fkey"
    FOREIGN KEY ("referrerCustomerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Referral"
    ADD CONSTRAINT "Referral_referredCustomerId_fkey"
    FOREIGN KEY ("referredCustomerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'REFERRAL_RECORDED';
