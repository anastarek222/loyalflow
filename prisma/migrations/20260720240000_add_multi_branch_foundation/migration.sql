-- Additive multi-branch foundation. Existing businesses keep operating as a
-- single location: no branch is created, no historical record is backfilled,
-- and all new branch references are nullable.
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BranchStaffAssignment" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchStaffAssignment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "LoyaltyTransaction" ADD COLUMN "branchId" TEXT;
ALTER TABLE "RewardRedemption" ADD COLUMN "branchId" TEXT;
ALTER TABLE "BusinessActivity" ADD COLUMN "branchId" TEXT;

CREATE UNIQUE INDEX "Branch_businessId_name_key" ON "Branch"("businessId", "name");
CREATE UNIQUE INDEX "Branch_id_businessId_key" ON "Branch"("id", "businessId");
CREATE INDEX "Branch_businessId_isActive_idx" ON "Branch"("businessId", "isActive");
CREATE UNIQUE INDEX "User_id_businessId_key" ON "User"("id", "businessId");
CREATE UNIQUE INDEX "BranchStaffAssignment_userId_branchId_key" ON "BranchStaffAssignment"("userId", "branchId");
CREATE INDEX "BranchStaffAssignment_businessId_branchId_idx" ON "BranchStaffAssignment"("businessId", "branchId");
CREATE INDEX "LoyaltyTransaction_businessId_branchId_createdAt_idx" ON "LoyaltyTransaction"("businessId", "branchId", "createdAt");
CREATE INDEX "RewardRedemption_businessId_branchId_createdAt_idx" ON "RewardRedemption"("businessId", "branchId", "createdAt");
CREATE INDEX "BusinessActivity_businessId_branchId_createdAt_idx" ON "BusinessActivity"("businessId", "branchId", "createdAt");

ALTER TABLE "Branch"
    ADD CONSTRAINT "Branch_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchStaffAssignment"
    ADD CONSTRAINT "BranchStaffAssignment_branchId_fkey"
    FOREIGN KEY ("branchId", "businessId") REFERENCES "Branch"("id", "businessId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BranchStaffAssignment"
    ADD CONSTRAINT "BranchStaffAssignment_userId_fkey"
    FOREIGN KEY ("userId", "businessId") REFERENCES "User"("id", "businessId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction"
    ADD CONSTRAINT "LoyaltyTransaction_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RewardRedemption"
    ADD CONSTRAINT "RewardRedemption_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessActivity"
    ADD CONSTRAINT "BusinessActivity_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
