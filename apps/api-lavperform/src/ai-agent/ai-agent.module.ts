import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAgentService } from './application/ai-agent.service';
import { AiAgentController } from './presentation/ai-agent.controller';
import { OverAgentApiModule } from '../integrations/over-agent-api/over-agent-api.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [PrismaModule, ConfigModule, OverAgentApiModule, WhatsappModule],
  controllers: [AiAgentController],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
