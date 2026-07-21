-- This migration is additive and leaves the deployed single-reward fields intact.
-- Apply only after confirming the target database's migration history and backup
-- policy; it has not been applied from this workspace.

CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RewardType" NOT NULL DEFAULT 'GIFT',
    "code" TEXT,
    "cost" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RewardRedemption" ADD COLUMN "rewardId" TEXT;

CREATE INDEX "Reward_businessId_isActive_cost_idx"
    ON "Reward"("businessId", "isActive", "cost");

CREATE INDEX "RewardRedemption_rewardId_idx"
    ON "RewardRedemption"("rewardId");

ALTER TABLE "Reward"
    ADD CONSTRAINT "Reward_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RewardRedemption"
    ADD CONSTRAINT "RewardRedemption_rewardId_fkey"
    FOREIGN KEY ("rewardId") REFERENCES "Reward"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
