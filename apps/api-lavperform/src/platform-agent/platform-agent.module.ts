import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OverAgentApiModule } from '../integrations/over-agent-api/over-agent-api.module';
import { PlatformAgentService } from './application/platform-agent.service';
import { PlatformAgentController } from './presentation/platform-agent.controller';

@Module({
  imports: [PrismaModule, OverAgentApiModule],
  controllers: [PlatformAgentController],
  providers: [PlatformAgentService],
})
export class PlatformAgentModule {}
