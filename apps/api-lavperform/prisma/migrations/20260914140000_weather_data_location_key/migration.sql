-- Cache meteorológico é snapshot (cron ~30 min). Recria com chave cidade+UF.
DELETE FROM "weather_data";

DROP INDEX IF EXISTS "weather_data_cityName_key";

ALTER TABLE "weather_data" ADD COLUMN "locationKey" TEXT NOT NULL;
ALTER TABLE "weather_data" ADD COLUMN "state" TEXT;

CREATE UNIQUE INDEX "weather_data_locationKey_key" ON "weather_data"("locationKey");
CREATE INDEX "weather_data_locationKey_idx" ON "weather_data"("locationKey");
