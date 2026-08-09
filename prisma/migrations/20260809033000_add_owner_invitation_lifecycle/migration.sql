CREATE TABLE "OwnerInvitation" (
  "id" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OwnerInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OwnerInvitation_email_key"
ON "OwnerInvitation"("email");

CREATE UNIQUE INDEX "OwnerInvitation_tokenHash_key"
ON "OwnerInvitation"("tokenHash");

CREATE INDEX "OwnerInvitation_email_expiresAt_usedAt_idx"
ON "OwnerInvitation"("email", "expiresAt", "usedAt");
