import { Module, forwardRef } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrderService } from './application/order.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { CompaniesModule } from '../companies/companies.module';
import { CustomersModule } from '../customers/customers.module';
import { OrderController } from './presentation/order.controller';
import { OrderPrismaRepository } from './infrastructure/persistence/prisma-order.repository';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    forwardRef(() => CompaniesModule),
    CustomersModule,
    EventEmitterModule,
  ],
  providers: [
    OrderService,
    {
      provide: 'IOrderRepository',
      useClass: OrderPrismaRepository,
    },
  ],
  exports: [OrderService, 'IOrderRepository'],
  controllers: [OrderController],
})
export class OrderModule {}
