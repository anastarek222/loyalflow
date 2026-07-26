CREATE TYPE "BillingInterval" AS ENUM (
  'FIFTEEN_DAYS',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUAL',
  'ANNUAL',
  'CUSTOM'
);

CREATE TYPE "PaymentStatus" AS ENUM (
  'TRIAL',
  'PAID',
  'DUE',
  'OVERDUE',
  'SUSPENDED'
);

ALTER TABLE "Business"
  ADD COLUMN "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "billingCustomDays" INTEGER,
  ADD COLUMN "subscriptionStartDate" TIMESTAMP(3),
  ADD COLUMN "nextPaymentDate" TIMESTAMP(3),
  ADD COLUMN "lastPaymentDate" TIMESTAMP(3),
  ADD COLUMN "subscriptionAmountMinor" INTEGER,
  ADD COLUMN "billingCurrency" TEXT,
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "gracePeriodDays" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "billingNotes" TEXT,
  ADD COLUMN "adminNotes" TEXT;

CREATE INDEX "Business_paymentStatus_nextPaymentDate_idx"
ON "Business"("paymentStatus", "nextPaymentDate");

CREATE INDEX "Business_nextPaymentDate_idx"
ON "Business"("nextPaymentDate");
