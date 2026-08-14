CREATE TYPE "IntegrationJobKind" AS ENUM ('GOOGLE_SHEETS_BUSINESS_SYNC');
CREATE TYPE "IntegrationJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'DEAD');

CREATE TABLE "IntegrationJob" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "kind" "IntegrationJobKind" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "IntegrationJobStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IntegrationJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IntegrationJob_businessId_kind_idempotencyKey_key"
  ON "IntegrationJob"("businessId", "kind", "idempotencyKey");

CREATE INDEX "IntegrationJob_status_availableAt_leaseExpiresAt_idx"
  ON "IntegrationJob"("status", "availableAt", "leaseExpiresAt");

CREATE INDEX "IntegrationJob_businessId_status_createdAt_idx"
  ON "IntegrationJob"("businessId", "status", "createdAt");

ALTER TABLE "IntegrationJob"
  ADD CONSTRAINT "IntegrationJob_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
