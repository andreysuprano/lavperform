import { Injectable } from '@nestjs/common';
import type { AgentTool, ToolExecutionContext } from '../tool.interface';

interface EndConversationInput {
  reason?: string;
}

@Injectable()
export class EndConversationTool implements AgentTool {
  readonly name = 'end_conversation';
  readonly description =
    'Encerra a conversa atual. Use quando o usuário solicitar o fim do atendimento ou quando o fluxo estiver concluído.';
  readonly inputSchema = {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Motivo do encerramento da conversa (opcional)',
      },
    },
  };

  async execute(
    input: unknown,
    _context: ToolExecutionContext,
  ): Promise<unknown> {
    const { reason } = (input ?? {}) as EndConversationInput;
    return {
      ended: true,
      reason: reason ?? 'Conversa encerrada pelo agente',
    };
  }
}
