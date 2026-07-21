-- Phase AB: Staff Attribution Foundation
-- Additive and backward-compatible.
-- Existing businesses keep attribution disabled.
-- Existing transactions and redemptions remain unattributed.

ALTER TABLE "Business"
ADD COLUMN "staffAttributionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "staffAttributionRequired" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "LoyaltyTransaction"
ADD COLUMN "attributedStaffId" TEXT;

ALTER TABLE "RewardRedemption"
ADD COLUMN "attributedStaffId" TEXT;

CREATE INDEX "LoyaltyTransaction_attributedStaffId_idx"
ON "LoyaltyTransaction"("attributedStaffId");

CREATE INDEX "RewardRedemption_attributedStaffId_idx"
ON "RewardRedemption"("attributedStaffId");

ALTER TABLE "LoyaltyTransaction"
ADD CONSTRAINT "LoyaltyTransaction_attributedStaffId_fkey"
FOREIGN KEY ("attributedStaffId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "RewardRedemption"
ADD CONSTRAINT "RewardRedemption_attributedStaffId_fkey"
FOREIGN KEY ("attributedStaffId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
