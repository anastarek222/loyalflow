CREATE TYPE "GoogleSheetsSyncState" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

ALTER TABLE "Business"
  ADD COLUMN "googleSheetId" INTEGER,
  ADD COLUMN "googleSheetTitle" TEXT,
  ADD COLUMN "googleSheetsSyncState" "GoogleSheetsSyncState" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "googleSheetsLastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "googleSheetsLastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "googleSheetsLastError" TEXT,
  ADD COLUMN "googleSheetsRetryable" BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX "Business_googleSheetId_key" ON "Business"("googleSheetId");
