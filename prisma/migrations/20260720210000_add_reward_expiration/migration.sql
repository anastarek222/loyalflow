-- Additive, backward-compatible reward-expiration foundation. Existing rewards
-- have no expiry by default and existing customer balances are untouched.
ALTER TABLE "Reward"
    ADD COLUMN "expiresAfterDays" INTEGER;

CREATE TABLE "RewardUnlock" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardUnlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RewardUnlock_businessId_customerId_expiresAt_idx"
    ON "RewardUnlock"("businessId", "customerId", "expiresAt");
CREATE INDEX "RewardUnlock_customerId_rewardId_redeemedAt_expiredAt_idx"
    ON "RewardUnlock"("customerId", "rewardId", "redeemedAt", "expiredAt");
CREATE INDEX "RewardUnlock_rewardId_expiresAt_idx"
    ON "RewardUnlock"("rewardId", "expiresAt");
CREATE UNIQUE INDEX "RewardUnlock_one_live_per_customer_reward"
    ON "RewardUnlock"("customerId", "rewardId")
    WHERE "redeemedAt" IS NULL AND "expiredAt" IS NULL;

ALTER TABLE "RewardUnlock"
    ADD CONSTRAINT "RewardUnlock_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardUnlock"
    ADD CONSTRAINT "RewardUnlock_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RewardUnlock"
    ADD CONSTRAINT "RewardUnlock_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "Reward"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'REWARD_UNLOCKED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'REWARD_EXPIRED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'REWARD_REDEMPTION_BLOCKED';
