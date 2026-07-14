-- CreateTable
CREATE TABLE "NotificationItemRead" (
    "id" TEXT NOT NULL,
    "notificationKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationItemRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationItemRead_userId_businessId_idx" ON "NotificationItemRead"("userId", "businessId");

-- CreateIndex
CREATE INDEX "NotificationItemRead_businessId_readAt_idx" ON "NotificationItemRead"("businessId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationItemRead_userId_businessId_notificationKey_key" ON "NotificationItemRead"("userId", "businessId", "notificationKey");

-- AddForeignKey
ALTER TABLE "NotificationItemRead" ADD CONSTRAINT "NotificationItemRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationItemRead" ADD CONSTRAINT "NotificationItemRead_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
