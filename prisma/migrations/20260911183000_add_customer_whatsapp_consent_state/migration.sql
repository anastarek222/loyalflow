ALTER TABLE "Customer"
  ADD COLUMN "whatsappPhoneE164" TEXT,
  ADD COLUMN "whatsappOptedOutAt" TIMESTAMP(3);

CREATE INDEX "Customer_businessId_whatsappPhoneE164_idx"
  ON "Customer"("businessId", "whatsappPhoneE164");
