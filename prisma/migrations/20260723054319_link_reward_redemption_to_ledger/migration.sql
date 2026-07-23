/*
  Warnings:

  - A unique constraint covering the columns `[transactionId,businessId]` on the table `RewardRedemption` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "RewardRedemption" ADD COLUMN     "transactionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "RewardRedemption_transactionId_businessId_key" ON "RewardRedemption"("transactionId", "businessId");

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_transactionId_businessId_fkey" FOREIGN KEY ("transactionId", "businessId") REFERENCES "LoyaltyTransaction"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
