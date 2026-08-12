import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  CONVERSATION_REPOSITORY,
  MessageRole,
} from '../../../application/webhook/ports/conversation.repository.port';
import type {
  ConversationMessageData,
  ConversationRepositoryPort,
  PaginatedConversations,
} from '../../../application/webhook/ports/conversation.repository.port';

interface ViewableMessage {
  id: string;
  role: Exclude<MessageRole, MessageRole.SYSTEM>;
  content: string;
  originalType: string | null;
  createdAt: Date;
}

@ApiTags('Conversas')
@Controller('agents/:agentId/conversations')
export class ConversationController {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepositoryPort,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar conversas do agente (agrupadas por cliente)',
  })
  @ApiParam({ name: 'agentId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkResponse({ description: 'Lista paginada de conversas' })
  async listConversations(
    @Param('agentId') agentId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<PaginatedConversations> {
    return this.conversationRepository.listByAgentId(agentId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
  }

  @Get(':conversationId/messages')
  @ApiOperation({
    summary: 'Listar mensagens visíveis de uma conversa (sem mensagens de sistema)',
  })
  @ApiParam({ name: 'agentId', type: String })
  @ApiParam({ name: 'conversationId', type: String })
  @ApiOkResponse({ description: 'Mensagens em ordem cronológica' })
  @ApiNotFoundResponse({ description: 'Conversa não encontrada para este agente' })
  async listMessages(
    @Param('agentId') agentId: string,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ): Promise<ViewableMessage[]> {
    const conversation =
      await this.conversationRepository.findById(conversationId);

    if (!conversation || conversation.agentId !== agentId) {
      throw new NotFoundException(
        `Conversa ${conversationId} não encontrada para o agente ${agentId}`,
      );
    }

    const messages =
      await this.conversationRepository.findViewableMessages(conversationId);

    return messages.map((message: ConversationMessageData) => ({
      id: message.id,
      role: message.role as Exclude<MessageRole, MessageRole.SYSTEM>,
      content: message.content,
      originalType: message.originalType,
      createdAt: message.createdAt,
    }));
  }
}
