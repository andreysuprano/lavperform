import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import * as basicAuth from 'express-basic-auth';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminCompaniesModule } from './companies/admin-companies.module';
import { AdminOnboardingModule } from './onboarding/admin-onboarding.module';
import { AdminUsersModule } from './users/admin-users.module';
import { AdminWhatsappModule } from './whatsapp/admin-whatsapp.module';
import { AdminCampaignsModule } from './campaigns/admin-campaigns.module';
import { AdminBillingModule } from './billing/admin-billing.module';
import { AdminBusinessPartnersModule } from './business-partners/admin-business-partners.module';
import { AdminIntegrationsModule } from './integrations/admin-integrations.module';
import { AdminAdministratorsModule } from './administrators/admin-administrators.module';
import { AdminOverviewModule } from './overview/admin-overview.module';
import { AdminDeduplicationModule } from './deduplication/admin-deduplication.module';
import { AdminApiKeysModule } from './api-keys/admin-api-keys.module';
import { RedisModule } from '../common/redis/redis.module';
import { QueueModule } from '../common/queue/queue.module';

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
    RedisModule,
    AdminAuthModule,
    AdminCompaniesModule,
    AdminUsersModule,
    AdminOnboardingModule,
    AdminWhatsappModule,
    AdminCampaignsModule,
    AdminBillingModule,
    AdminBusinessPartnersModule,
    AdminIntegrationsModule,
    AdminAdministratorsModule,
    AdminOverviewModule,
    AdminDeduplicationModule,
    AdminApiKeysModule,
  ],
})
export class AdminModule {}
