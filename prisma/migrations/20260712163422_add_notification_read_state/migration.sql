-- CreateTable
CREATE TABLE "NotificationReadState" (
    "id" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationReadState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotificationReadState_businessId_lastReadAt_idx" ON "NotificationReadState"("businessId", "lastReadAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationReadState_userId_businessId_key" ON "NotificationReadState"("userId", "businessId");

-- AddForeignKey
ALTER TABLE "NotificationReadState" ADD CONSTRAINT "NotificationReadState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationReadState" ADD CONSTRAINT "NotificationReadState_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
