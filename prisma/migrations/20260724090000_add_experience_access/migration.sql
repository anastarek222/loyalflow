-- U6.2 owner-controlled experience access. This is additive and preserves
-- every existing account's current Simple/Advanced availability.
CREATE TYPE "ExperienceAccess" AS ENUM ('SIMPLE_ONLY', 'ADVANCED_ONLY', 'BOTH');

ALTER TABLE "User"
ADD COLUMN "experienceAccess" "ExperienceAccess" NOT NULL DEFAULT 'BOTH';

ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'USER_EXPERIENCE_ACCESS_UPDATED';
