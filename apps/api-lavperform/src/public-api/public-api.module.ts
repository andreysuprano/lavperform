import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import * as basicAuth from 'express-basic-auth';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../common/queue/queue.module';
import { PublicApiAuthModule } from './auth/public-api-auth.module';
import { PublicOrdersModule } from './orders/public-orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    QueueModule,
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
      middleware: basicAuth({
        challenge: true,
        users: { admin: process.env.BULL_BOARD_PASSWORD ?? 'admin' },
      }),
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    PublicApiAuthModule,
    PublicOrdersModule,
  ],
})
export class PublicApiModule {}
