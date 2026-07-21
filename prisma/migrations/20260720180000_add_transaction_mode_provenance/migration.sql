-- Add immutable provenance for future earned-loyalty records. Historical rows
-- remain null and are intentionally excluded from spend/visit metrics.
ALTER TABLE "LoyaltyTransaction"
    ADD COLUMN "sourceLoyaltyMode" "LoyaltyMode",
    ADD COLUMN "saleAmount" INTEGER;

CREATE INDEX "LoyaltyTransaction_businessId_sourceLoyaltyMode_createdAt_idx"
    ON "LoyaltyTransaction"("businessId", "sourceLoyaltyMode", "createdAt");
