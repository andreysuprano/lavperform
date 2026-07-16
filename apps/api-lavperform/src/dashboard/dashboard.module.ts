import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { CustomersModule } from '../customers/customers.module';
import { PrismaDashboardRepository } from './infrastructure/persistence/prisma-dashboard.repository';
import { MessageCostModule } from '../message-engine/pricing/message-cost.module';

@Module({
  imports: [CustomersModule, MessageCostModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    {
      provide: 'IDashboardRepository',
      useClass: PrismaDashboardRepository,
    },
  ],
  exports: [DashboardService],
})
export class DashboardModule {} 