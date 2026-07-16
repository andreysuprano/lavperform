import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { PrismaMetricsUnitOfWork } from './infrastructure/persistence/prisma-metrics-unit-of-work';

@Module({
  imports: [PrismaModule, CompaniesModule, UsersModule],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    {
      provide: 'IMetricsUnitOfWork',
      useClass: PrismaMetricsUnitOfWork,
    },
  ],
})
export class MetricsModule {}   