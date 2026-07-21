-- Add optional business profile settings without changing existing records.
ALTER TABLE "Business"
ADD COLUMN "currency" TEXT,
ADD COLUMN "timezone" TEXT;
