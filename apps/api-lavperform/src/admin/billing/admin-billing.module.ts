import { Module } from '@nestjs/common';
import { CompaniesModule } from '../../companies/companies.module';
import { CreditsModule } from '../../credits/credits.module';
import { AsaasModule } from '../../integrations/asaas/asaas.module';
import { PlansModule } from '../../plans/plans.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminBillingController } from './admin-billing.controller';
import { AdminCompanyBillingController } from './admin-company-billing.controller';
import { AdminBillingService } from './admin-billing.service';

@Module({
  imports: [PrismaModule, AsaasModule, PlansModule, CompaniesModule, CreditsModule],
  controllers: [AdminBillingController, AdminCompanyBillingController],
  providers: [AdminBillingService],
})
export class AdminBillingModule {}
