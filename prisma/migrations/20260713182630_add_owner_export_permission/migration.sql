-- Add per-business owner export permission.
-- Existing businesses keep export access.
-- New businesses start with export disabled.

ALTER TABLE "Business"
ADD COLUMN "allowOwnerDataExport"
BOOLEAN NOT NULL DEFAULT false;

UPDATE "Business"
SET "allowOwnerDataExport" = true;
