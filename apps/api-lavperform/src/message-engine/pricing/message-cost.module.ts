import { Module } from '@nestjs/common';
import { MessageCostService } from './message-cost.service';

@Module({
  providers: [MessageCostService],
  exports: [MessageCostService],
})
export class MessageCostModule {}
