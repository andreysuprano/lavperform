import { Inject, Injectable, Logger } from '@nestjs/common';
import type { IncomingMessage, TextIncomingMessage } from '../types/incoming-message.types';
import { MessageHandlerPort } from './message-handler.port';
import { MessageNormalizerService } from '../services/message-normalizer.service';
import { MessageFilterService } from '../services/message-filter.service';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import { CONVERSATION_REPOSITORY, MessageRole } from '../ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../ports/conversation.repository.port';
import { AgentRunnerService } from '../../agent-runner/services/agent-runner.service';
import { JourneyOrchestratorService } from '../../customer-journey/services/journey-orchestrator.service';

@Injectable()
export class TextMessageHandler implements MessageHandlerPort {
  private readonly logger = new Logger(TextMessageHandler.name);

  constructor(
    private readonly normalizer: MessageNormalizerService,
    private readonly filter: MessageFilterService,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly agentRunner: AgentRunnerService,
    private readonly journeyOrchestrator: JourneyOrchestratorService,
  ) {}

  async handle(message: IncomingMessage, agent: AgentWithConfigsData): Promise<void> {
    const msg = message as TextIncomingMessage;

    // 1. Filtro de acesso (fromMe, takeover humano, telefone / grupo)
    const accessResult = await this.filter.checkAccess(message, agent);
    if (!accessResult.allowed) {
      this.logger.debug(`[TEXT] Acesso bloqueado: ${accessResult.reason}`);
      return;
    }

    // 2. Filtro de gatilho — texto disponível imediatamente para TEXT
    const triggerResult = this.filter.checkTrigger(msg.text, agent);
    if (!triggerResult.allowed) {
      this.logger.debug(`[TEXT] Gatilho não acionado: ${triggerResult.reason}`);
      return;
    }

    // 3. Normalização — aplica limpeza do gatilho se configurado
    const textToProcess = triggerResult.cleanedText ?? msg.text;
    const normalizedMessage = { ...message, text: textToProcess } as TextIncomingMessage;
    const prompt = await this.normalizer.normalize(normalizedMessage, agent);

    this.logger.log(
      `[TEXT] agent=${agent.id} | sender=${prompt.context.senderPhone} | msg="${prompt.userMessage.slice(0, 80)}"`,
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

    // 5. Persiste mensagem do usuário no histórico
    await this.conversationRepository.addMessage({
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: prompt.userMessage,
      originalType: prompt.originalMessageType,
    });

    const journeyResult = await this.journeyOrchestrator.onInboundMessage({
      agent,
      conversation,
      message: prompt.userMessage,
    });

    if (journeyResult.skipLlm) {
      this.logger.log(
        `[TEXT] LLM ignorado (jornada) | conv=${conversation.id} | escalated=${journeyResult.escalated}`,
      );
      return;
    }

    this.logger.log(`[TEXT] conversation=${conversation.id} | invocando LLM`);

    await this.agentRunner.run(prompt, conversation, agent);
  }
}
