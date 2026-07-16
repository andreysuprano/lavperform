import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ApplicationModule } from './application/application.module';
import { CustomersModule } from './customers/customers.module';
import { ConfigModule } from '@nestjs/config';
import { QueueModule } from './common/queue/queue.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AutomaticCampaignModule } from './automatic-campaign/automatic-campaign.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { WebhooksModule } from './integrations/webhooks/webhooks.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { OrderModule } from './orders/order.module';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import * as basicAuth from 'express-basic-auth';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenAIModule } from './integrations/openai/openai.module';
import { MessageEngineModule } from './message-engine/message-engine.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MetricsModule } from './metrics/metrics.module';
import { LinkPageModule } from './link-page/link-page.module';
import { LandingPageModule } from './landing-page/landing-page.module';
import { CoursesModule } from './courses/courses.module';
import { WeatherAlertModule } from './weather-alert/weather-alert.module';
import { AiAgentModule } from './ai-agent/ai-agent.module';
import { VmLavModule } from './integrations/vmlav/vmlav.module';
import { CiccloModule } from './integrations/cicclo/cicclo.module';
import { L2AutomateModule } from './integrations/l2automate/l2automate.module';
import { ConsumerModule } from './integrations/consumer/consumer.module';
import { MaxlavModule } from './integrations/maxlav/maxlav.module';
import { RfvEngineModule } from './rfv-engine/rfv-engine.module';
import { ConversionWindowModule } from './conversion-window/conversion-window.module';
import { SaleAttributionModule } from './sale-attribution/sale-attribution.module';
import { CouponsModule } from './coupons/coupons.module';
import { SolvefyAdsModule } from './solvefyads/solvefyads.module';
import { CreditsModule } from './credits/credits.module';
import { MetaIntegrationModule } from './integrations/meta/meta-integration.module';
import { DeduplicationModule } from './deduplication/deduplication.module';
import { RenitencyModule } from './renitency/renitency.module';
import { PublicApiOrderWorkerModule } from './public-api/orders/public-api-order-worker.module';
import { AudiencesModule } from './audiences/audiences.module';
import { CompanyApiKeysModule } from './api-keys/company-api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
      middleware: basicAuth({
        challenge: true,
        users: { admin: process.env.BULL_BOARD_PASSWORD ?? 'admin' },
      }),
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    MessageEngineModule,
    DashboardModule,
    PrismaModule,
    ApplicationModule,
    CompaniesModule,
    UsersModule,
    OnboardingModule,
    CustomersModule,
    AudiencesModule,
    QueueModule,
    CampaignsModule,
    MetricsModule,
    AutomaticCampaignModule,
    WhatsappModule,
    LinkPageModule,
    LandingPageModule,
    WeatherAlertModule,
    WebhooksModule,
    OrderModule,
    OpenAIModule,
    CoursesModule,
    AiAgentModule,
    VmLavModule,
    CiccloModule,
    L2AutomateModule,
    ConsumerModule,
    MaxlavModule,
    RfvEngineModule,
    ConversionWindowModule,
    SaleAttributionModule,
    CouponsModule,
    SolvefyAdsModule,
    CreditsModule,
    MetaIntegrationModule,
    DeduplicationModule,
    RenitencyModule,
    PublicApiOrderWorkerModule,
    CompanyApiKeysModule,
    ...(process.env.ENVIRONMENT === 'production'
      ? [SentryModule.forRoot()]
      : []),
  ],
  controllers: [],
})
export class AppModule {}
