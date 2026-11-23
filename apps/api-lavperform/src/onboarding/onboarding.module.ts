import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CompaniesModule } from '../companies/companies.module';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import { PartnersModule } from '../partners/partners.module';
import { LinkPageModule } from '../link-page/link-page.module';
import { AsaasModule } from '../integrations/asaas/asaas.module';
import { WeatherAlertModule } from '../weather-alert/weather-alert.module';
import { SessionRefreshModule } from '../integrations/session-refresh/session-refresh.module';

@Module({
  imports: [
    PrismaModule,
    CompaniesModule,
    UsersModule,
    AsaasModule,
    PlansModule,
    PartnersModule,
    LinkPageModule,
    WeatherAlertModule,
    SessionRefreshModule,
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule { }
