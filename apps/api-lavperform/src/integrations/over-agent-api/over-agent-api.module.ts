import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { LavaiAgentApiService, OverAgentApiService } from './over-agent-api.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    }),
    ConfigModule,
  ],
  providers: [
    LavaiAgentApiService,
    { provide: OverAgentApiService, useExisting: LavaiAgentApiService },
  ],
  exports: [LavaiAgentApiService, OverAgentApiService],
})
export class OverAgentApiModule {}
