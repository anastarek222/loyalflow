-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityType" ADD VALUE 'REWARD_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'REWARD_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'REWARD_STATUS_CHANGED';
ALTER TYPE "ActivityType" ADD VALUE 'OFFER_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'OFFER_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'OFFER_STATUS_CHANGED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_CREATED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_UPDATED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_ACTIVATED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_DEACTIVATED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_STAFF_ASSIGNED';
ALTER TYPE "ActivityType" ADD VALUE 'BRANCH_STAFF_REMOVED';
