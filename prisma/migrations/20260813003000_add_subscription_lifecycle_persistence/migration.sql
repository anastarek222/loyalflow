CREATE TYPE "SubscriptionLifecycleState" AS ENUM (
  'PENDING',
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELED',
  'EXPIRED'
);

ALTER TABLE "Business"
ADD COLUMN "subscriptionLifecycleState" "SubscriptionLifecycleState" NOT NULL DEFAULT 'TRIALING',
ADD COLUMN "subscriptionLifecycleVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "subscriptionLifecycleChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Business"
SET "subscriptionLifecycleState" = CASE
  WHEN "paymentStatus" = 'PAID' THEN 'ACTIVE'::"SubscriptionLifecycleState"
  WHEN "paymentStatus" = 'DUE' THEN 'ACTIVE'::"SubscriptionLifecycleState"
  WHEN "paymentStatus" = 'OVERDUE' THEN 'PAST_DUE'::"SubscriptionLifecycleState"
  WHEN "paymentStatus" = 'SUSPENDED' THEN 'SUSPENDED'::"SubscriptionLifecycleState"
  ELSE 'TRIALING'::"SubscriptionLifecycleState"
END;
