-- Owner invitations are deliberately not attached to a tenant until launch.
-- The draft is private to the account and is only used by the owner onboarding flow.
CREATE TYPE "OwnerOnboardingStatus" AS ENUM ('PENDING', 'COMPLETE');

ALTER TABLE "User"
  ADD COLUMN "onboardingStatus" "OwnerOnboardingStatus" NOT NULL DEFAULT 'COMPLETE',
  ADD COLUMN "onboardingData" JSONB;
