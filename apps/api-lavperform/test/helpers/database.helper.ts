import { PrismaClient } from '@prisma/client';

/**
 * Truncates all tables in the database except _prisma_migrations
 * This is used to clean up the database between tests
 */
export async function truncateAllTables(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname='public'
    AND tablename != '_prisma_migrations'
  `;

  // Disable foreign key constraints temporarily
  await prisma.$executeRawUnsafe('SET session_replication_role = replica;');

  // Truncate all tables
  for (const { tablename } of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" RESTART IDENTITY CASCADE;`);
  }

  // Re-enable foreign key constraints
  await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
}

/**
 * Closes all Prisma connections
 */
export async function disconnectPrisma(prisma: PrismaClient): Promise<void> {
  await prisma.$disconnect();
}
