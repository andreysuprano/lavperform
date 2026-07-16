import { Module } from '@nestjs/common';
import { RedisModule } from '../../common/redis/redis.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminOverviewController } from './admin-overview.controller';
import { AdminOverviewRepository } from './admin-overview.repository';
import { AdminOverviewService } from './admin-overview.service';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [AdminOverviewController],
  providers: [AdminOverviewRepository, AdminOverviewService],
})
export class AdminOverviewModule {}
