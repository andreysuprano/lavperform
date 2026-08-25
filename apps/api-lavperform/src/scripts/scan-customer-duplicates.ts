import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { CustomerDuplicateService } from '../deduplication/application/customer-duplicate.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Escaneia empresas com telefone/CPF duplicados, mescla grupos de nomes
 * parecidos e deixa o restante para revisão no admin.
 *
 * Uso:
 *   npm run script:scan-customer-duplicates
 *   DRY_RUN=1 npm run script:scan-customer-duplicates
 *   COMPANY_ID=<uuid> npm run script:scan-customer-duplicates
 */

const isDryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';
const companyIdFilter = process.env.COMPANY_ID?.trim() || '';

async function listCompaniesWithDuplicates(prisma: PrismaClient): Promise<string[]> {
  if (companyIdFilter) {
    return [companyIdFilter];
  }

  const rows = await prisma.$queryRaw<{ companyId: string }[]>`
    SELECT DISTINCT "companyId" FROM (
      SELECT "companyId"
      FROM "Customer"
      WHERE "phone" IS NOT NULL AND "phone" <> ''
      GROUP BY "companyId", "phone"
      HAVING COUNT(*) > 1
      UNION
      SELECT "companyId"
      FROM "Customer"
      WHERE "cpf" IS NOT NULL AND "cpf" <> ''
      GROUP BY "companyId", "cpf"
      HAVING COUNT(*) > 1
    ) dupes
    ORDER BY "companyId"
  `;

  return rows.map((row) => row.companyId);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está configurado.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const rfvQueue = { add: async () => undefined };
  const service = new CustomerDuplicateService(
    prisma as unknown as PrismaService,
    rfvQueue as never,
  );

  try {
    const table = await prisma.$queryRaw<{ exists: string | null }[]>`
      SELECT to_regclass('public.customer_merge_review')::text AS exists
    `;
    if (!table[0]?.exists) {
      throw new Error(
        'A tabela customer_merge_review não existe. Rode `npx prisma migrate deploy` nesta API e tente de novo.',
      );
    }

    const companyIds = await listCompaniesWithDuplicates(prisma);
    console.log(
      `${isDryRun ? 'DRY_RUN — ' : ''}Empresas com duplicatas: ${companyIds.length}`,
    );

    let mergedGroups = 0;
    let absorbed = 0;
    let skipped = 0;
    let reviewGroups = 0;
    let pendingAuto = 0;

    for (let index = 0; index < companyIds.length; index += 1) {
      const companyId = companyIds[index];
      const result = await service.scanAndAutoMerge(companyId, { dryRun: isDryRun });
      mergedGroups += result.mergedGroups;
      absorbed += result.absorbed;
      skipped += result.skipped;
      reviewGroups += result.reviewGroups;
      pendingAuto += result.pendingAutoGroups;

      console.log(
        `[${index + 1}/${companyIds.length}] ${companyId}` +
          ` normalized=${result.normalized}` +
          ` merged=${result.mergedGroups}` +
          ` absorbed=${result.absorbed}` +
          ` skipped=${result.skipped}` +
          ` review=${result.reviewGroups}` +
          ` pendingAuto=${result.pendingAutoGroups}`,
      );
    }

    console.log('\nResumo');
    console.log(`  empresas: ${companyIds.length}`);
    console.log(`  grupos mesclados: ${mergedGroups}`);
    console.log(`  cadastros absorvidos: ${absorbed}`);
    console.log(`  grupos já resolvidos (overlap): ${skipped}`);
    console.log(`  grupos em revisão: ${reviewGroups}`);
    console.log(`  grupos auto ainda pendentes: ${pendingAuto}`);
    if (!isDryRun && reviewGroups > 0) {
      console.log(
        '\nO que restou com nomes divergentes fica na ficha da empresa no admin.',
      );
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
