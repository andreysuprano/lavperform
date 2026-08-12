import { Module } from '@nestjs/common';
import { CONVERSATION_REPOSITORY } from '../../application/webhook/ports/conversation.repository.port';
import { ConversationController } from '../../infrastructure/http/conversation/conversation.controller';
import { PrismaConversationRepository } from '../../infrastructure/persistence/repositories/prisma-conversation.repository';

@Module({
  controllers: [ConversationController],
  providers: [
    PrismaConversationRepository,
    { provide: CONVERSATION_REPOSITORY, useExisting: PrismaConversationRepository },
  ],
})
export class ConversationModule {}
