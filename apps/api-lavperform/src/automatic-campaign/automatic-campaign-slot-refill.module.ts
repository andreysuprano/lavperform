import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { AutomaticCampaignSlotRefillService } from './application/automatic-campaign-slot-refill.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
    }),
  ],
  providers: [AutomaticCampaignSlotRefillService],
  exports: [AutomaticCampaignSlotRefillService],
})
export class AutomaticCampaignSlotRefillModule {}
