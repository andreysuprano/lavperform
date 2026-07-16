-- CreateTable
CREATE TABLE "weather_alert_history" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "condition" "WeatherCondition" NOT NULL,
    "tempC" DOUBLE PRECISION NOT NULL,
    "tempF" DOUBLE PRECISION NOT NULL,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_alert_history_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "weatherAlertHistoryId" TEXT;

-- CreateIndex
CREATE INDEX "weather_alert_history_companyId_idx" ON "weather_alert_history"("companyId");

-- CreateIndex
CREATE INDEX "weather_alert_history_companyId_sentAt_idx" ON "weather_alert_history"("companyId", "sentAt");

-- CreateIndex
CREATE INDEX "Message_weatherAlertHistoryId_idx" ON "Message"("weatherAlertHistoryId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_weatherAlertHistoryId_fkey" FOREIGN KEY ("weatherAlertHistoryId") REFERENCES "weather_alert_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weather_alert_history" ADD CONSTRAINT "weather_alert_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
