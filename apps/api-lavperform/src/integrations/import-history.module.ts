import { Module } from '@nestjs/common';
import { ImportHistoryStrategyFactory } from './import-history-strategy.factory';

@Module({
  providers: [ImportHistoryStrategyFactory],
  exports: [ImportHistoryStrategyFactory],
})
export class ImportHistoryModule {}
