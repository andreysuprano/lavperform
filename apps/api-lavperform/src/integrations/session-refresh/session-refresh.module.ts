import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { workerProviders } from '../../common/queue/worker-runtime.config';
import { TokenCipher } from '../../social-publishing/token-cipher';
import { IntegrationSessionService } from './integration-session.service';
import { IntegrationsEngineSessionClient } from './integrations-engine-session.client';
import { SessionRefreshTasks } from './session-refresh.tasks';

@Module({
  imports: [PrismaModule, HttpModule],
  providers: [
    TokenCipher,
    IntegrationsEngineSessionClient,
    IntegrationSessionService,
    ...workerProviders(SessionRefreshTasks),
  ],
  exports: [IntegrationSessionService],
})
export class SessionRefreshModule {}
