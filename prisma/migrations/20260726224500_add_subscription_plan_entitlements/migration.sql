CREATE TYPE "SubscriptionPlan" AS ENUM (
  'FREE',
  'STARTER',
  'PRO',
  'BUSINESS'
);

ALTER TABLE "Business"
  ADD COLUMN "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BUSINESS',
  ADD COLUMN "planChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserve all existing tenants at their current full-feature behaviour.
UPDATE "Business" SET "plan" = 'BUSINESS';

-- New businesses default to FREE unless Super Admin explicitly chooses another plan.
ALTER TABLE "Business"
  ALTER COLUMN "plan" SET DEFAULT 'FREE';

CREATE INDEX "Business_plan_idx" ON "Business"("plan");


CREATE TABLE "PlanConfiguration" (
  "id" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL,
  "customerLimit" INTEGER,
  "userLimit" INTEGER,
  "branchLimit" INTEGER,
  "offerLimit" INTEGER,
  "rewardLimit" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlanConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanConfiguration_plan_key"
ON "PlanConfiguration"("plan");

CREATE INDEX "PlanConfiguration_plan_idx"
ON "PlanConfiguration"("plan");

INSERT INTO "PlanConfiguration"
  ("id", "plan", "customerLimit", "userLimit", "branchLimit", "offerLimit", "rewardLimit", "createdAt", "updatedAt")
VALUES
  ('plan-free', 'FREE', 100, 2, 1, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan-starter', 'STARTER', 500, 5, 1, 5, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan-pro', 'PRO', 2500, 15, 5, 25, 25, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('plan-business', 'BUSINESS', NULL, NULL, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
