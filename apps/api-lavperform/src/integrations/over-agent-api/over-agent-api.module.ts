import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { LavaiAgentApiService } from './over-agent-api.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    }),
    ConfigModule,
  ],
  providers: [LavaiAgentApiService],
  exports: [LavaiAgentApiService],
})
export class OverAgentApiModule {}
