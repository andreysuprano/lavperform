import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage, VideoIncomingMessage } from '../types/incoming-message.types';
import { MessageHandlerPort } from './message-handler.port';
import { MessageNormalizerService } from '../services/message-normalizer.service';
import { MessageFilterService } from '../services/message-filter.service';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import { CONVERSATION_REPOSITORY, MessageRole } from '../ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../ports/conversation.repository.port';
import { AgentRunnerService } from '../../agent-runner/services/agent-runner.service';

@Injectable()
export class VideoMessageHandler implements MessageHandlerPort {
  private readonly logger = new Logger(VideoMessageHandler.name);

  constructor(
    private readonly normalizer: MessageNormalizerService,
    private readonly filter: MessageFilterService,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly agentRunner: AgentRunnerService,
  ) {}

  async handle(message: IncomingMessage, agent: AgentWithConfigsData): Promise<void> {
    const msg = message as VideoIncomingMessage;

    // 1. Filtro de acesso (fromMe, takeover humano, telefone / grupo)
    const accessResult = await this.filter.checkAccess(message, agent);
    if (!accessResult.allowed) {
      this.logger.debug(`[VIDEO] Acesso bloqueado: ${accessResult.reason}`);
      return;
    }

    // 2. Filtro de gatilho usando a legenda (caption) — sem chamar Vision ainda
    const captionText = msg.caption ?? '';
    const triggerResult = this.filter.checkTrigger(captionText, agent);
    if (!triggerResult.allowed) {
      this.logger.debug(`[VIDEO] Gatilho não acionado na legenda: ${triggerResult.reason}`);
      return;
    }

    // 3. Normalização completa (Vision via thumbnail) — só após filtros
    this.logger.log(`[VIDEO] Normalizando vídeo (Vision) para agent=${agent.id}...`);
    const prompt = await this.normalizer.normalize(message, agent);

    this.logger.log(
      `[VIDEO] agent=${agent.id} | sender=${prompt.context.senderPhone} | caption="${captionText.slice(0, 60)}"`,
    );

    // 4. Upsert da conversa
    const conversation = await this.conversationRepository.upsert({
      agentId: agent.id,
      companyId: msg.companyId,
      chatId: msg.chatId,
      userId: msg.senderId,
      userPhone: msg.senderPhone,
      userName: msg.senderName,
      isGroup: msg.isGroup,
      groupName: msg.groupName,
      instanceName: msg.instanceName,
      instanceToken: msg.instanceToken,
    });

    // 5. Persiste mensagem do usuário
    await this.conversationRepository.addMessage({
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: prompt.userMessage,
      originalType: prompt.originalMessageType,
    });

    this.logger.log(`[VIDEO] conversation=${conversation.id} | invocando LLM`);

    await this.agentRunner.run(prompt, conversation, agent);
  }
}
