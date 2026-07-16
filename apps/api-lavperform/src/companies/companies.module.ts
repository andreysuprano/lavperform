import { Module, forwardRef } from '@nestjs/common';
import { CompaniesService } from './application/companies.service';
import { CompaniesController } from './presentation/companies.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { CompanyPrismaRepository } from './infrastructure/persistence/prisma-company.repository';
import { PartnersModule } from '../partners/partners.module';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { RfvEngineModule } from '../rfv-engine/rfv-engine.module';
import { RenitencyModule } from '../renitency/renitency.module';
import { ImportHistoryModule } from '../integrations/import-history.module';

@Module({
  imports: [
    PrismaModule,
    PartnersModule,
    AiAgentModule,
    forwardRef(() => RfvEngineModule),
    RenitencyModule,
    forwardRef(() => ImportHistoryModule),
    HttpModule,
  ],
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    {
      provide: 'ICompanyRepository',
      useClass: CompanyPrismaRepository,
    },
  ],
  exports: [
    CompaniesService,
    'ICompanyRepository',
  ],
})
export class CompaniesModule {}
