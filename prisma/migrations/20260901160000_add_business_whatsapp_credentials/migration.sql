CREATE TABLE "BusinessWhatsAppCredential" (
  "businessId" TEXT NOT NULL,
  "phoneNumberId" VARCHAR(80) NOT NULL,
  "accessTokenCiphertext" TEXT NOT NULL,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BusinessWhatsAppCredential_pkey" PRIMARY KEY ("businessId"),
  CONSTRAINT "BusinessWhatsAppCredential_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
