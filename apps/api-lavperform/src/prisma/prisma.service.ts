import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const poolMax = Number(process.env.DATABASE_POOL_MAX ?? 20);
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number.isFinite(poolMax) && poolMax > 0 ? poolMax : 20,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    // Configura timezone UTC para a sessão PostgreSQL
    // Garante que todas as operações de data sejam em UTC
    await this.$executeRaw`SET timezone = 'UTC'`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
} 