-- Additive promotion foundation. Existing earning and redemption records are
-- unchanged; promotion audit rows can only reference new earned transactions.
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "loyaltyMode" "LoyaltyMode",
    "minimumTransactionAmount" INTEGER,
    "bonusAmount" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromotionApplication" (
    "id" TEXT NOT NULL,
    "bonusAmount" INTEGER NOT NULL,
    "promotionId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PromotionApplication_transactionId_key"
    ON "PromotionApplication"("transactionId");
CREATE INDEX "Promotion_businessId_isActive_startsAt_endsAt_idx"
    ON "Promotion"("businessId", "isActive", "startsAt", "endsAt");
CREATE INDEX "PromotionApplication_businessId_customerId_createdAt_idx"
    ON "PromotionApplication"("businessId", "customerId", "createdAt");
CREATE INDEX "PromotionApplication_promotionId_createdAt_idx"
    ON "PromotionApplication"("promotionId", "createdAt");

ALTER TABLE "Promotion"
    ADD CONSTRAINT "Promotion_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionApplication"
    ADD CONSTRAINT "PromotionApplication_promotionId_fkey"
    FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionApplication"
    ADD CONSTRAINT "PromotionApplication_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionApplication"
    ADD CONSTRAINT "PromotionApplication_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromotionApplication"
    ADD CONSTRAINT "PromotionApplication_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "LoyaltyTransaction"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
