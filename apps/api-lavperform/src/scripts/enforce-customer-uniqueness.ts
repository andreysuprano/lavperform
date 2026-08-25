import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Cria os índices únicos de telefone e CPF em Customer depois que a base
 * estiver limpa (sem duplicatas preenchidas).
 *
 * Uso:
 *   npm run script:enforce-customer-uniqueness
 *   DRY_RUN=1 npm run script:enforce-customer-uniqueness
 *
 * Este script NÃO mescla clientes. Se ainda houver duplicatas, ele aborta
 * de propósito (exit 1) para não criar índices que quebrariam o banco.
 */

type DuplicateRow = {
  companyId: string;
  value: string;
  count: bigint | number;
};

const isDryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

async function findDuplicates(
  prisma: PrismaClient,
  field: 'phone' | 'cpf',
): Promise<DuplicateRow[]> {
  const column = field === 'phone' ? '"phone"' : '"cpf"';
  return prisma.$queryRawUnsafe<DuplicateRow[]>(
    `SELECT "companyId", ${column} AS value, COUNT(*)::int AS count
     FROM "Customer"
     WHERE ${column} IS NOT NULL AND ${column} <> ''
     GROUP BY "companyId", ${column}
     HAVING COUNT(*) > 1
     ORDER BY COUNT(*) DESC`,
  );
}

async function indexExists(prisma: PrismaClient, name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM pg_indexes WHERE indexname = ${name}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

function printDuplicateSample(label: string, rows: DuplicateRow[], field: 'phone' | 'cpf') {
  console.error(`${label}: ${rows.length} grupo(s)`);
  for (const row of rows.slice(0, 20)) {
    console.error(`  company=${row.companyId} ${field}=${row.value} count=${row.count}`);
  }
  if (rows.length > 20) {
    console.error(`  … e mais ${rows.length - 20}`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não está configurado.');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  let failed = false;

  try {
    const phoneDupes = await findDuplicates(prisma, 'phone');
    const cpfDupes = await findDuplicates(prisma, 'cpf');

    if (phoneDupes.length > 0 || cpfDupes.length > 0) {
      console.error('Ainda existem duplicatas preenchidas. Não é seguro criar os índices.');
      console.error(
        'Este script não mescla. Escaneie e mescle no admin (ficha da empresa → duplicatas) e rode de novo.\n',
      );
      if (phoneDupes.length > 0) {
        printDuplicateSample('Telefone', phoneDupes, 'phone');
      }
      if (cpfDupes.length > 0) {
        console.error('');
        printDuplicateSample('CPF', cpfDupes, 'cpf');
      }
      failed = true;
    } else {
      console.log('Nenhuma duplicata preenchida de telefone ou CPF.');

      if (isDryRun) {
        console.log('DRY_RUN: índices não foram criados.');
      } else {
        if (!(await indexExists(prisma, 'Customer_phone_companyId_key'))) {
          await prisma.$executeRawUnsafe(
            `CREATE UNIQUE INDEX "Customer_phone_companyId_key" ON "Customer"("phone", "companyId")`,
          );
          console.log('Criado índice Customer_phone_companyId_key');
        } else {
          console.log('Índice Customer_phone_companyId_key já existe');
        }

        if (!(await indexExists(prisma, 'Customer_cpf_companyId_key'))) {
          await prisma.$executeRawUnsafe(
            `CREATE UNIQUE INDEX "Customer_cpf_companyId_key" ON "Customer"("cpf", "companyId")`,
          );
          console.log('Criado índice Customer_cpf_companyId_key');
        } else {
          console.log('Índice Customer_cpf_companyId_key já existe');
        }
      }
    }
  } finally {
    await prisma.$disconnect().catch(() => undefined);
    await pool.end().catch(() => undefined);
  }

  if (failed) {
    process.exit(1);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
