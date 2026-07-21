-- Additive tenant-private customer metadata. Existing customers, balances,
-- loyalty transactions, public-card data, and branch history are untouched.
CREATE TABLE "CustomerTag" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerTagAssignment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTagAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerNote" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_id_businessId_key" ON "Customer"("id", "businessId");
CREATE UNIQUE INDEX "CustomerTag_businessId_name_key" ON "CustomerTag"("businessId", "name");
CREATE UNIQUE INDEX "CustomerTag_id_businessId_key" ON "CustomerTag"("id", "businessId");
CREATE INDEX "CustomerTag_businessId_name_idx" ON "CustomerTag"("businessId", "name");
CREATE UNIQUE INDEX "CustomerTagAssignment_customerId_tagId_key" ON "CustomerTagAssignment"("customerId", "tagId");
CREATE INDEX "CustomerTagAssignment_businessId_tagId_idx" ON "CustomerTagAssignment"("businessId", "tagId");
CREATE INDEX "CustomerTagAssignment_businessId_customerId_idx" ON "CustomerTagAssignment"("businessId", "customerId");
CREATE INDEX "CustomerNote_businessId_customerId_updatedAt_idx" ON "CustomerNote"("businessId", "customerId", "updatedAt");
CREATE INDEX "CustomerNote_createdById_idx" ON "CustomerNote"("createdById");
CREATE INDEX "CustomerNote_updatedById_idx" ON "CustomerNote"("updatedById");

ALTER TABLE "CustomerTagAssignment"
    ADD CONSTRAINT "CustomerTagAssignment_customerId_businessId_fkey"
    FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerTag"
    ADD CONSTRAINT "CustomerTag_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerTagAssignment"
    ADD CONSTRAINT "CustomerTagAssignment_tagId_businessId_fkey"
    FOREIGN KEY ("tagId", "businessId") REFERENCES "CustomerTag"("id", "businessId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerNote"
    ADD CONSTRAINT "CustomerNote_customerId_businessId_fkey"
    FOREIGN KEY ("customerId", "businessId") REFERENCES "Customer"("id", "businessId")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerNote"
    ADD CONSTRAINT "CustomerNote_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerNote"
    ADD CONSTRAINT "CustomerNote_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CUSTOMER_TAG_ASSIGNED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CUSTOMER_TAG_REMOVED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CUSTOMER_NOTE_CREATED';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CUSTOMER_NOTE_UPDATED';
