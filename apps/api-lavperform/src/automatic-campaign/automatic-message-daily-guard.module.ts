import { Module } from '@nestjs/common';
import { AutomaticMessageDailyGuardService } from './application/automatic-message-daily-guard.service';

@Module({
  providers: [AutomaticMessageDailyGuardService],
  exports: [AutomaticMessageDailyGuardService],
})
export class AutomaticMessageDailyGuardModule {}
