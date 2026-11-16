CREATE TABLE "company_meta_pixels" (
    "companyId" TEXT NOT NULL,
    "pixelId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_meta_pixels_pkey" PRIMARY KEY ("companyId")
);

CREATE TABLE "company_gtm_containers" (
    "companyId" TEXT NOT NULL,
    "containerId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_gtm_containers_pkey" PRIMARY KEY ("companyId")
);

ALTER TABLE "company_meta_pixels" ADD CONSTRAINT "company_meta_pixels_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_gtm_containers" ADD CONSTRAINT "company_gtm_containers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
