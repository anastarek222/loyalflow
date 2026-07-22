-- CreateEnum
CREATE TYPE "ThemePreset" AS ENUM ('DEFAULT', 'LUXURY', 'MODERN', 'MINIMAL', 'DARK', 'GRADIENT');

-- CreateEnum
CREATE TYPE "ButtonStyle" AS ENUM ('ROUNDED', 'PILL', 'SQUARE');

-- CreateEnum
CREATE TYPE "CardLayout" AS ENUM ('CLASSIC', 'COMPACT', 'PREMIUM');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "backgroundColor" TEXT NOT NULL DEFAULT '#F8FAFC',
ADD COLUMN     "buttonStyle" "ButtonStyle" NOT NULL DEFAULT 'ROUNDED',
ADD COLUMN     "cardStyle" "CardLayout" NOT NULL DEFAULT 'CLASSIC',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "facebookUrl" TEXT,
ADD COLUMN     "fontFamily" TEXT NOT NULL DEFAULT 'INTER',
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "qrStyle" TEXT NOT NULL DEFAULT 'CLASSIC',
ADD COLUMN     "themePreset" "ThemePreset" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "tiktokUrl" TEXT;

-- AlterTable
ALTER TABLE "BusinessActivity" ADD COLUMN     "deviceName" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "businessId" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_businessId_createdAt_idx" ON "Notification"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
