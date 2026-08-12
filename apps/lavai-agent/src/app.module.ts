import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { AgentModule } from './modules/agent/agent.module';
import { CompanyModule } from './modules/company/company.module';
import { QueueModule } from './modules/queue/queue.module';
import { RagModule } from './modules/rag/rag.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { McpModule } from './modules/mcp/mcp.module';
import { AgentTraceModule } from './modules/agent-trace/agent-trace.module';
import { CustomerJourneyModule } from './modules/customer-journey/customer-journey.module';
import { ConversationModule } from './modules/conversation/conversation.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CompanyModule,
    AgentModule,
    QueueModule,
    RagModule,
    WebhookModule,
    McpModule,
    AgentTraceModule,
    CustomerJourneyModule,
    ConversationModule,
  ],
})
export class AppModule {}
