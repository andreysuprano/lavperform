-- AlterTable
ALTER TABLE "public"."AutomaticCampaign" ADD COLUMN     "daysOfWeek" TEXT[] DEFAULT ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']::TEXT[];
