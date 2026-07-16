import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { OverAgentApiService } from './over-agent-api.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    }),
    ConfigModule,
  ],
  providers: [OverAgentApiService],
  exports: [OverAgentApiService],
})
export class OverAgentApiModule {}
