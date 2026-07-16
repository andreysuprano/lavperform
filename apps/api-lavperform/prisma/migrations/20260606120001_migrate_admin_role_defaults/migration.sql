-- Migra perfis legados ADMIN para SDR
UPDATE "AdminUser" SET role = 'SDR' WHERE role = 'ADMIN';

-- AlterTable
ALTER TABLE "AdminUser" ALTER COLUMN "role" SET DEFAULT 'SDR';
