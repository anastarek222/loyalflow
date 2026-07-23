/*
  Warnings:

  - A unique constraint covering the columns `[id,businessId]` on the table `LoyaltyTransaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,businessId]` on the table `Promotion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[transactionId,businessId]` on the table `PromotionApplication` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[id,businessId]` on the table `Reward` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "BusinessActivity" DROP CONSTRAINT "BusinessActivity_branchId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessActivity" DROP CONSTRAINT "BusinessActivity_createdById_fkey";

-- DropForeignKey
ALTER TABLE "BusinessActivity" DROP CONSTRAINT "BusinessActivity_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerNote" DROP CONSTRAINT "CustomerNote_createdById_fkey";

-- DropForeignKey
ALTER TABLE "CustomerNote" DROP CONSTRAINT "CustomerNote_updatedById_fkey";

-- DropForeignKey
ALTER TABLE "CustomerReferralCode" DROP CONSTRAINT "CustomerReferralCode_customerId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTransaction" DROP CONSTRAINT "LoyaltyTransaction_attributedStaffId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTransaction" DROP CONSTRAINT "LoyaltyTransaction_branchId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTransaction" DROP CONSTRAINT "LoyaltyTransaction_createdById_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTransaction" DROP CONSTRAINT "LoyaltyTransaction_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionApplication" DROP CONSTRAINT "PromotionApplication_customerId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionApplication" DROP CONSTRAINT "PromotionApplication_promotionId_fkey";

-- DropForeignKey
ALTER TABLE "PromotionApplication" DROP CONSTRAINT "PromotionApplication_transactionId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referredCustomerId_fkey";

-- DropForeignKey
ALTER TABLE "Referral" DROP CONSTRAINT "Referral_referrerCustomerId_fkey";

-- DropForeignKey
ALTER TABLE "RewardRedemption" DROP CONSTRAINT "RewardRedemption_attributedStaffId_fkey";

-- DropForeignKey
ALTER TABLE "RewardRedemption" DROP CONSTRAINT "RewardRedemption_branchId_fkey";

-- DropForeignKey
ALTER TABLE "RewardRedemption" DROP CONSTRAINT "RewardRedemption_createdById_fkey";

-- DropForeignKey
ALTER TABLE "RewardRedemption" DROP CONSTRAINT "RewardRedemption_customerId_fkey";

-- DropForeignKey
ALTER TABLE "RewardRedemption" DROP CONSTRAINT "RewardRedemption_rewardId_fkey";

-- DropForeignKey
ALTER TABLE "RewardUnlock" DROP CONSTRAINT "RewardUnlock_customerId_fkey";

-- DropForeignKey
ALTER TABLE "RewardUnlock" DROP CONSTRAINT "RewardUnlock_rewardId_fkey";

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTransaction_id_businessId_key" ON "LoyaltyTransaction"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_id_businessId_key" ON "Promotion"("id", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionApplication_transactionId_businessId_key" ON "PromotionApplication"("transactionId", "businessId");

-- CreateIndex
CREATE UNIQUE INDEX "Reward_id_businessId_key" ON "Reward"("id", "businessId");

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_createdById_businessId_fkey" FOREIGN KEY ("createdById", "businessId") REFERENCES "User"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_updatedById_businessId_fkey" FOREIGN KEY ("updatedById", "businessId") REFERENCES "User"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "Branch"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_createdById_businessId_fkey" FOREIGN KEY ("createdById", "businessId") REFERENCES "User"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_attributedStaffId_businessId_fkey" FOREIGN KEY ("attributedStaffId", "businessId") REFERENCES "User"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionApplication" ADD CONSTRAINT "PromotionApplication_promotionId_businessId_fkey" FOREIGN KEY ("promotionId", "businessId") REFERENCES "Promotion"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionApplication" ADD CONSTRAINT "PromotionApplication_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionApplication" ADD CONSTRAINT "PromotionApplication_transactionId_businessId_fkey" FOREIGN KEY ("transactionId", "businessId") REFERENCES "LoyaltyTransaction"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "Branch"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_createdById_businessId_fkey" FOREIGN KEY ("createdById", "businessId") REFERENCES "User"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_attributedStaffId_businessId_fkey" FOREIGN KEY ("attributedStaffId", "businessId") REFERENCES "User"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_businessId_fkey" FOREIGN KEY ("rewardId", "businessId") REFERENCES "Reward"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardUnlock" ADD CONSTRAINT "RewardUnlock_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardUnlock" ADD CONSTRAINT "RewardUnlock_rewardId_businessId_fkey" FOREIGN KEY ("rewardId", "businessId") REFERENCES "Reward"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerReferralCode" ADD CONSTRAINT "CustomerReferralCode_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerCustomerId_businessId_fkey" FOREIGN KEY ("referrerCustomerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredCustomerId_businessId_fkey" FOREIGN KEY ("referredCustomerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessActivity" ADD CONSTRAINT "BusinessActivity_branchId_businessId_fkey" FOREIGN KEY ("branchId", "businessId") REFERENCES "Branch"("id", "businessId") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessActivity" ADD CONSTRAINT "BusinessActivity_createdById_businessId_fkey" FOREIGN KEY ("createdById", "businessId") REFERENCES "User"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessActivity" ADD CONSTRAINT "BusinessActivity_customerId_businessId_fkey" FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_businessId_fkey" FOREIGN KEY ("userId", "businessId") REFERENCES "User"("id", "businessId") ON DELETE CASCADE ON UPDATE CASCADE;
