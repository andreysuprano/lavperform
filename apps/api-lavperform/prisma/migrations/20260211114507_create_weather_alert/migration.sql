-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('SUNNY', 'CLOUDY', 'RAINING', 'COLD');

-- CreateTable
CREATE TABLE "weather_alerts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "condition" "WeatherCondition" NOT NULL,
    "daysOfWeek" TEXT[],
    "dailyAlerts" INTEGER NOT NULL,
    "giftId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weather_alerts_companyId_key" ON "weather_alerts"("companyId");

-- CreateIndex
CREATE INDEX "weather_alerts_companyId_idx" ON "weather_alerts"("companyId");

-- CreateIndex
CREATE INDEX "weather_alerts_active_idx" ON "weather_alerts"("active");

-- AddForeignKey
ALTER TABLE "weather_alerts" ADD CONSTRAINT "weather_alerts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
