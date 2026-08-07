-- Add the typed, tenant-safe ledger foundation for future refund/reversal commands.
-- This migration is intentionally additive. It does not backfill or mutate
-- historical loyalty transactions.

ALTER TYPE "TransactionType"
ADD VALUE IF NOT EXISTS 'REVERSAL';

DO $$
BEGIN
  CREATE TYPE "ReversalKind" AS ENUM (
    'EARN_REFUND',
    'EARN_VOID',
    'REDEMPTION_REVERSAL'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "LoyaltyTransaction"
ADD COLUMN IF NOT EXISTS "reversalOfTransactionId" TEXT,
ADD COLUMN IF NOT EXISTS "reversalKind" "ReversalKind",
ADD COLUMN IF NOT EXISTS "reversalReason" TEXT;

CREATE INDEX IF NOT EXISTS "LoyaltyTransaction_businessId_reversalOfTransactionId_createdAt_idx"
ON "LoyaltyTransaction"("businessId", "reversalOfTransactionId", "createdAt");

DO $$
BEGIN
  ALTER TABLE "LoyaltyTransaction"
  ADD CONSTRAINT "LoyaltyTransaction_reversalOfTransactionId_businessId_fkey"
  FOREIGN KEY ("reversalOfTransactionId", "businessId")
  REFERENCES "LoyaltyTransaction"("id", "businessId")
  ON DELETE NO ACTION
  ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "LoyaltyTransaction"
  ADD CONSTRAINT "LoyaltyTransaction_reversal_metadata_check"
  CHECK (
    (
      "reversalOfTransactionId" IS NULL
      AND "reversalKind" IS NULL
      AND "reversalReason" IS NULL
    )
    OR
    (
      "reversalOfTransactionId" IS NOT NULL
      AND "reversalKind" IS NOT NULL
      AND "reversalReason" IS NOT NULL
      AND length(btrim("reversalReason")) > 0
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
