-- Migration intentionally created only. Do not apply outside loyalflow_test.
ALTER TABLE "Business"
  ADD COLUMN "standardCardArtworkEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "standardCardArtworkCategory" TEXT NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "customCardArtworkEnabled" BOOLEAN NOT NULL DEFAULT false;
