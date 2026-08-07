-- Persist the exact RewardUnlock claimed by a redemption so a future reversal
-- can restore only the unlock that was actually consumed. Existing historical
-- redemptions remain nullable because the prior schema did not preserve this
-- identity and it cannot be reconstructed safely.
ALTER TABLE "RewardRedemption"
ADD COLUMN "rewardUnlockId" TEXT;

-- Composite tenant key required by the same-business foreign key below.
CREATE UNIQUE INDEX "RewardUnlock_id_businessId_key"
ON "RewardUnlock"("id", "businessId");

-- One unlock may back at most one redemption. PostgreSQL permits multiple NULL
-- values here, preserving legacy redemptions with unknown unlock provenance.
CREATE UNIQUE INDEX "RewardRedemption_rewardUnlockId_businessId_key"
ON "RewardRedemption"("rewardUnlockId", "businessId");

ALTER TABLE "RewardRedemption"
ADD CONSTRAINT "RewardRedemption_rewardUnlockId_businessId_fkey"
FOREIGN KEY ("rewardUnlockId", "businessId")
REFERENCES "RewardUnlock"("id", "businessId")
ON DELETE NO ACTION
ON UPDATE CASCADE;
