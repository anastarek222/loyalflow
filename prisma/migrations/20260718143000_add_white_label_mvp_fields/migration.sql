-- Add optional White Label MVP settings. Existing businesses retain NULL values.
ALTER TABLE "Business"
ADD COLUMN "coverImageUrl" TEXT,
ADD COLUMN "loyaltyProgramName" TEXT,
ADD COLUMN "pointsName" TEXT,
ADD COLUMN "membershipName" TEXT,
ADD COLUMN "welcomeMessage" TEXT;
