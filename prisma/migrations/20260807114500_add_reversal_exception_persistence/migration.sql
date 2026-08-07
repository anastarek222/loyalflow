CREATE TYPE "ReversalExceptionReason" AS ENUM ('INSUFFICIENT_BALANCE');

CREATE TYPE "ReversalExceptionStatus" AS ENUM ('OPEN', 'RESOLVED');

CREATE TABLE "ReversalException" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "originalTransactionId" TEXT NOT NULL,
  "operationId" TEXT NOT NULL,
  "reversalKind" "ReversalKind" NOT NULL,
  "blockReason" "ReversalExceptionReason" NOT NULL,
  "status" "ReversalExceptionStatus" NOT NULL DEFAULT 'OPEN',
  "attemptedAmount" INTEGER NOT NULL,
  "attemptedSaleAmount" INTEGER,
  "availableBalance" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" "UserRole" NOT NULL,
  "branchId" TEXT,
  "attributedStaffId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ReversalException_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReversalException_businessId_operationId_key"
  ON "ReversalException"("businessId", "operationId");

CREATE INDEX "ReversalException_businessId_status_createdAt_idx"
  ON "ReversalException"("businessId", "status", "createdAt");

CREATE INDEX "ReversalException_businessId_customerId_status_createdAt_idx"
  ON "ReversalException"("businessId", "customerId", "status", "createdAt");

CREATE INDEX "ReversalException_businessId_originalTransactionId_createdAt_idx"
  ON "ReversalException"("businessId", "originalTransactionId", "createdAt");

ALTER TABLE "ReversalException"
  ADD CONSTRAINT "ReversalException_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReversalException"
  ADD CONSTRAINT "ReversalException_customerId_businessId_fkey"
  FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReversalException"
  ADD CONSTRAINT "ReversalException_originalTransactionId_businessId_fkey"
  FOREIGN KEY ("originalTransactionId", "businessId") REFERENCES "LoyaltyTransaction"("id", "businessId")
  ON DELETE NO ACTION ON UPDATE CASCADE;
