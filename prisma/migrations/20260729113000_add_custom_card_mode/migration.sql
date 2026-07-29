-- Migration intentionally created only. Do not apply anywhere yet.
CREATE TYPE "CardDesignMode" AS ENUM ('STANDARD', 'CUSTOM');

ALTER TABLE "Business"
  ADD COLUMN "cardDesignMode" "CardDesignMode" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "customCardFrontArtworkUrl" TEXT,
  ADD COLUMN "customCardBackArtworkUrl" TEXT,
  ADD COLUMN "customCardSafeZoneVersion" TEXT NOT NULL DEFAULT 'ID1_V1';
