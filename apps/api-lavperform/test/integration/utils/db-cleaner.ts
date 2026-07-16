import { PrismaClient } from '@prisma/client';

export class DatabaseCleaner {
  constructor(private prisma: PrismaClient) {}

  async cleanAll(): Promise<void> {
    const tablenames = await this.prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename != '_prisma_migrations'
    `;

    try {
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);
      for (const { tablename } of tablenames) {
        if (tablename !== '_prisma_migrations') {
           await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
        }
      }
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (error) {
       await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
       throw error;
    }
  }

  async cleanTables(tableNames: string[]): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

      for (const table of tableNames) {
        await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      }

      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
    } catch (error) {
      await this.prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);
      throw error;
    }
  }
}
