-- Add sales amount loyalty mode.

ALTER TYPE "LoyaltyMode"
ADD VALUE IF NOT EXISTS 'SALES_AMOUNT';

DO $$
BEGIN
  CREATE TYPE "RewardType" AS ENUM (
    'GIFT',
    'PROMO_CODE',
    'DISCOUNT',
    'CUSTOM'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "rewardType"
"RewardType" NOT NULL DEFAULT 'GIFT';

ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "rewardCode"
TEXT;

ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "rewardDescription"
TEXT;
