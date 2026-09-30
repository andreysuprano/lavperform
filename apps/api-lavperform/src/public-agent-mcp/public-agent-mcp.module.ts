import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OverAgentApiModule } from '../integrations/over-agent-api/over-agent-api.module';
import { PublicAgentMcpService } from './application/public-agent-mcp.service';
import { PublicAgentMcpController } from './presentation/public-agent-mcp.controller';

@Module({
  imports: [PrismaModule, OverAgentApiModule],
  controllers: [PublicAgentMcpController],
  providers: [PublicAgentMcpService],
})
export class PublicAgentMcpModule {}
