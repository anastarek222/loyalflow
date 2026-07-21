-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "taxNumber" TEXT,
ADD COLUMN     "website" TEXT;

-- RenameForeignKey
ALTER TABLE "BranchStaffAssignment" RENAME CONSTRAINT "BranchStaffAssignment_branchId_fkey" TO "BranchStaffAssignment_branchId_businessId_fkey";

-- RenameForeignKey
ALTER TABLE "BranchStaffAssignment" RENAME CONSTRAINT "BranchStaffAssignment_userId_fkey" TO "BranchStaffAssignment_userId_businessId_fkey";
