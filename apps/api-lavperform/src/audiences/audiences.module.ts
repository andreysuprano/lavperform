import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AudiencesController } from './presentation/audiences.controller';
import { AudiencesService } from './application/audiences.service';
import { AudienceQueryEngine } from './application/audience-query.engine';
import { CampaignCustomerResolverService } from './application/campaign-customer-resolver.service';
import { AudiencePrismaRepository } from './infrastructure/persistence/prisma-audience.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AudiencesController],
  providers: [
    AudiencesService,
    AudienceQueryEngine,
    CampaignCustomerResolverService,
    {
      provide: 'IAudienceRepository',
      useClass: AudiencePrismaRepository,
    },
  ],
  exports: [
    AudiencesService,
    AudienceQueryEngine,
    CampaignCustomerResolverService,
  ],
})
export class AudiencesModule {}
