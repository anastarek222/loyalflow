CREATE TABLE "SuperAdminMfa" (
    "userId" TEXT NOT NULL,
    "secretCiphertext" TEXT NOT NULL,
    "enrollmentTokenHash" TEXT,
    "enrollmentExpiresAt" TIMESTAMP(3),
    "enabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuperAdminMfa_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "SuperAdminMfaRecoveryCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdminMfaRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SuperAdminMfa_enrollmentTokenHash_key"
ON "SuperAdminMfa"("enrollmentTokenHash");

CREATE UNIQUE INDEX "SuperAdminMfaRecoveryCode_codeHash_key"
ON "SuperAdminMfaRecoveryCode"("codeHash");

CREATE INDEX "SuperAdminMfaRecoveryCode_userId_usedAt_idx"
ON "SuperAdminMfaRecoveryCode"("userId", "usedAt");

ALTER TABLE "SuperAdminMfa"
ADD CONSTRAINT "SuperAdminMfa_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SuperAdminMfaRecoveryCode"
ADD CONSTRAINT "SuperAdminMfaRecoveryCode_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
