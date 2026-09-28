import { Module } from '@nestjs/common';
import { AudiencesModule } from '../audiences/audiences.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AutomaticCampaignBatchService } from './application/automatic-campaign-batch.service';

@Module({
  imports: [PrismaModule, AudiencesModule],
  providers: [AutomaticCampaignBatchService],
  exports: [AutomaticCampaignBatchService],
})
export class AutomaticCampaignBatchModule {}
