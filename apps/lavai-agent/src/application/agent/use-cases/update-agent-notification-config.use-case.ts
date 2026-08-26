import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AGENT_REPOSITORY,
  AgentNotificationConfigData,
  UpdateAgentNotificationConfigInput,
} from '../ports/agent.repository.port';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';
import { normalizeBrazilianWhatsAppPhone } from '../utils/normalize-brazilian-whatsapp-phone';

@Injectable()
export class UpdateAgentNotificationConfigUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly repository: AgentRepositoryPort,
  ) {}

  async execute(
    agentId: string,
    input: UpdateAgentNotificationConfigInput,
  ): Promise<AgentNotificationConfigData> {
    const agent = await this.repository.findById(agentId);
    if (!agent) {
      throw new NotFoundException(`Agente com id "${agentId}" não encontrado.`);
    }

    let nextPhone: string | null;
    if (input.helpNotificationPhone !== undefined) {
      const raw = input.helpNotificationPhone?.trim() || '';
      if (!raw) {
        nextPhone = null;
      } else {
        nextPhone = normalizeBrazilianWhatsAppPhone(raw);
        if (!nextPhone) {
          throw new BadRequestException(
            'Telefone inválido. Use DDI + DDD + número (ex: 5511999999999 ou 11999999999).',
          );
        }
      }
    } else {
      nextPhone = agent.notificationConfig?.helpNotificationPhone ?? null;
    }

    let nextEnabled =
      input.helpNotificationEnabled ??
      agent.notificationConfig?.helpNotificationEnabled ??
      false;

    // Telefone é opcional: sem destino, a notificação fica desligada.
    if (!nextPhone) {
      nextEnabled = false;
    }

    const nextIgnoreReplies =
      input.helpNotificationIgnoreReplies ??
      agent.notificationConfig?.helpNotificationIgnoreReplies ??
      true;

    return this.repository.updateNotificationConfig(agentId, {
      helpNotificationEnabled: nextEnabled,
      helpNotificationPhone: nextPhone,
      helpNotificationIgnoreReplies: nextIgnoreReplies,
    });
  }
}
