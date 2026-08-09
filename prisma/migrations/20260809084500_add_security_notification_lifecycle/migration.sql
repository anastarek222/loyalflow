CREATE TABLE "SecurityNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SecurityNotification_userId_createdAt_idx"
ON "SecurityNotification"("userId", "createdAt");

CREATE INDEX "SecurityNotification_eventType_createdAt_idx"
ON "SecurityNotification"("eventType", "createdAt");

ALTER TABLE "SecurityNotification"
ADD CONSTRAINT "SecurityNotification_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
