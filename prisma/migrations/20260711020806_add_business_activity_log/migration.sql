-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CUSTOMER_CREATED', 'CUSTOMER_UPDATED', 'CUSTOMER_DEACTIVATED', 'CUSTOMER_REACTIVATED', 'LOYALTY_EARNED', 'REWARD_REDEEMED', 'BALANCE_ADJUSTED', 'BUSINESS_SETTINGS_UPDATED', 'USER_CREATED', 'USER_STATUS_CHANGED');

-- CreateTable
CREATE TABLE "BusinessActivity" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessActivity_businessId_createdAt_idx" ON "BusinessActivity"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "BusinessActivity_customerId_idx" ON "BusinessActivity"("customerId");

-- CreateIndex
CREATE INDEX "BusinessActivity_createdById_idx" ON "BusinessActivity"("createdById");

-- CreateIndex
CREATE INDEX "BusinessActivity_type_idx" ON "BusinessActivity"("type");

-- AddForeignKey
ALTER TABLE "BusinessActivity" ADD CONSTRAINT "BusinessActivity_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessActivity" ADD CONSTRAINT "BusinessActivity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessActivity" ADD CONSTRAINT "BusinessActivity_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
