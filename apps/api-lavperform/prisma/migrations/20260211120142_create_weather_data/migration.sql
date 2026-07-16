-- CreateTable
CREATE TABLE "weather_data" (
    "id" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "tzId" TEXT NOT NULL,
    "localtimeEpoch" INTEGER NOT NULL,
    "localtime" TEXT NOT NULL,
    "lastUpdatedEpoch" INTEGER NOT NULL,
    "lastUpdated" TEXT NOT NULL,
    "tempC" DOUBLE PRECISION NOT NULL,
    "tempF" DOUBLE PRECISION NOT NULL,
    "isDay" INTEGER NOT NULL,
    "conditionText" TEXT NOT NULL,
    "conditionIcon" TEXT NOT NULL,
    "conditionCode" INTEGER NOT NULL,
    "windMph" DOUBLE PRECISION NOT NULL,
    "windKph" DOUBLE PRECISION NOT NULL,
    "windDegree" INTEGER NOT NULL,
    "windDir" TEXT NOT NULL,
    "pressureMb" DOUBLE PRECISION NOT NULL,
    "pressureIn" DOUBLE PRECISION NOT NULL,
    "precipMm" DOUBLE PRECISION NOT NULL,
    "precipIn" DOUBLE PRECISION NOT NULL,
    "humidity" INTEGER NOT NULL,
    "cloud" INTEGER NOT NULL,
    "feelslikeC" DOUBLE PRECISION NOT NULL,
    "feelslikeF" DOUBLE PRECISION NOT NULL,
    "windchillC" DOUBLE PRECISION NOT NULL,
    "windchillF" DOUBLE PRECISION NOT NULL,
    "heatindexC" DOUBLE PRECISION NOT NULL,
    "heatindexF" DOUBLE PRECISION NOT NULL,
    "dewpointC" DOUBLE PRECISION NOT NULL,
    "dewpointF" DOUBLE PRECISION NOT NULL,
    "visKm" DOUBLE PRECISION NOT NULL,
    "visMiles" DOUBLE PRECISION NOT NULL,
    "uv" DOUBLE PRECISION NOT NULL,
    "gustMph" DOUBLE PRECISION NOT NULL,
    "gustKph" DOUBLE PRECISION NOT NULL,
    "shortRad" DOUBLE PRECISION NOT NULL,
    "diffRad" DOUBLE PRECISION NOT NULL,
    "dni" DOUBLE PRECISION NOT NULL,
    "gti" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weather_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weather_data_cityName_key" ON "weather_data"("cityName");

-- CreateIndex
CREATE INDEX "weather_data_cityName_idx" ON "weather_data"("cityName");
