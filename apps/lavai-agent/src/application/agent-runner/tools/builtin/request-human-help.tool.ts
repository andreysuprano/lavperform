import { Injectable, Inject } from '@nestjs/common';
import type { AgentTool, ToolExecutionContext } from '../tool.interface';
import { HelpEscalationService } from '../../../customer-journey/services/help-escalation.service';
import { AGENT_REPOSITORY } from '../../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../../agent/ports/agent.repository.port';
import { CONVERSATION_REPOSITORY } from '../../../webhook/ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../../../webhook/ports/conversation.repository.port';

interface RequestHumanHelpInput {
  reason?: string;
}

@Injectable()
export class RequestHumanHelpTool implements AgentTool {
  readonly name = 'request_human_help';
  readonly description =
    'Solicita a presença de um atendente humano. Use quando o cliente pedir ajuda, atendente, humano, problema ou quiser falar com uma pessoa.';
  readonly inputSchema = {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Motivo da solicitação (opcional)',
      },
    },
  };

  constructor(
    private readonly helpEscalation: HelpEscalationService,
    @Inject(AGENT_REPOSITORY)
    private readonly agentRepo: AgentRepositoryPort,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepo: ConversationRepositoryPort,
  ) {}

  async execute(
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<unknown> {
    const { reason } = (input ?? {}) as RequestHumanHelpInput;

    const agent = await this.agentRepo.findById(context.agentId);
    if (!agent?.journeyConfig?.enabled) {
      return { escalated: false, reason: 'Jornada não habilitada para este agente' };
    }

    const conversation = await this.conversationRepo.findById(context.conversationId);
    if (!conversation) {
      return { escalated: false, reason: 'Conversa não encontrada' };
    }

    const result = await this.helpEscalation.escalate({
      agent,
      conversation,
      lastMessage: reason,
    });

    return {
      escalated: true,
      alreadyEscalated: result.alreadyEscalated,
      helpRequestId: result.helpRequestId,
    };
  }
}
