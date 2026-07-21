-- Additive activation support for loyalty promotions. All new columns are
-- nullable so historical transactions and any pre-existing promotion records
-- remain valid without a backfill.
ALTER TABLE "LoyaltyTransaction"
    ADD COLUMN "idempotencyKey" TEXT;

ALTER TABLE "Promotion"
    ADD COLUMN "bonusMultiplier" INTEGER;

ALTER TABLE "PromotionApplication"
    ADD COLUMN "baseAmount" INTEGER;

CREATE UNIQUE INDEX "LoyaltyTransaction_businessId_idempotencyKey_key"
    ON "LoyaltyTransaction"("businessId", "idempotencyKey");
