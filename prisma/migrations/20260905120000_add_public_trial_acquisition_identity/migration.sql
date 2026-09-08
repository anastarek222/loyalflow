CREATE TYPE "OwnerInvitationSource" AS ENUM ('MANAGED', 'PUBLIC_TRIAL');

ALTER TABLE "OwnerInvitation"
ADD COLUMN "phone" TEXT,
ADD COLUMN "businessName" TEXT,
ADD COLUMN "country" TEXT,
ADD COLUMN "source" "OwnerInvitationSource" NOT NULL DEFAULT 'MANAGED';

CREATE UNIQUE INDEX "OwnerInvitation_phone_key"
ON "OwnerInvitation"("phone");
