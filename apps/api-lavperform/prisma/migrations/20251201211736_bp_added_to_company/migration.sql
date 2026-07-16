-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "businessPartnerId" TEXT;

-- AlterTable
ALTER TABLE "public"."LinkPage" ALTER COLUMN "biography" SET DEFAULT 'A melhor experiência gastronômica que você pode ter hoje! 👨🏻‍🍳',
ALTER COLUMN "bgColor" SET DEFAULT 'white';

-- AddForeignKey
ALTER TABLE "public"."Company" ADD CONSTRAINT "Company_businessPartnerId_fkey" FOREIGN KEY ("businessPartnerId") REFERENCES "public"."BusinessPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
