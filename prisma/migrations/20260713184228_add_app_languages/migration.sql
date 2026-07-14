-- Add Arabic and English preferences.

DO $$
BEGIN
  CREATE TYPE "AppLanguage" AS ENUM ('AR', 'EN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "language"
"AppLanguage" NOT NULL DEFAULT 'AR';

ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "cardDefaultLanguage"
"AppLanguage" NOT NULL DEFAULT 'AR';
