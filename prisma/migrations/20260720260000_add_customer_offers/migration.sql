-- Additive customer-facing offers. Offers are separate from loyalty rewards,
-- promotions, campaigns, balances, transactions, and historical records.
CREATE TYPE "OfferEligibility" AS ENUM ('ALL', 'SEGMENT', 'VIP');

CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "eligibility" "OfferEligibility" NOT NULL DEFAULT 'ALL',
    "segment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Offer_businessId_isActive_validFrom_validUntil_idx"
ON "Offer"("businessId", "isActive", "validFrom", "validUntil");
CREATE INDEX "Offer_businessId_eligibility_idx"
ON "Offer"("businessId", "eligibility");

ALTER TABLE "Offer"
ADD CONSTRAINT "Offer_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
