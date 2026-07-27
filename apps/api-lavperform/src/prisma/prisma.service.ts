import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { createDatabasePool } from './database-pool';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool;

  constructor() {
    const pool = createDatabasePool();
    super({ adapter: new PrismaPg(pool) });
    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    // Configura timezone UTC para a sessão PostgreSQL
    // Garante que todas as operações de data sejam em UTC
    await this.$executeRaw`SET timezone = 'UTC'`;
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
} 