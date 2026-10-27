import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MessageType,
  type AudioIncomingMessage,
  type IncomingMessage,
  type TextIncomingMessage,
} from '../types/incoming-message.types';
import { MessageHandlerPort } from './message-handler.port';
import { MessageNormalizerService } from '../services/message-normalizer.service';
import { MessageFilterService } from '../services/message-filter.service';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import { CONVERSATION_REPOSITORY, MessageRole } from '../ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../ports/conversation.repository.port';
import { AgentRunnerService } from '../../agent-runner/services/agent-runner.service';
import { WaitingAckService } from '../services/waiting-ack.service';

@Injectable()
export class AudioMessageHandler implements MessageHandlerPort {
  private readonly logger = new Logger(AudioMessageHandler.name);

  constructor(
    private readonly normalizer: MessageNormalizerService,
    private readonly filter: MessageFilterService,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepositoryPort,
    private readonly agentRunner: AgentRunnerService,
    private readonly waitingAck: WaitingAckService,
  ) {}

  async handle(message: IncomingMessage, agent: AgentWithConfigsData): Promise<void> {
    const msg = message as AudioIncomingMessage;

    // 1. Filtro de acesso (fromMe, takeover humano, telefone / grupo)
    const accessResult = await this.filter.checkAccess(message, agent);
    if (!accessResult.allowed) {
      this.logger.debug(`[AUDIO] Acesso bloqueado: ${accessResult.reason}`);
      return;
    }

    // 2. Para áudio, a normalização (Whisper) é necessária ANTES do check de trigger
    //    pois não há texto disponível previamente.
    this.logger.log(`[AUDIO] Normalizando (transcrevendo) áudio para agent=${agent.id}...`);
    const prompt = await this.normalizer.normalize(message, agent);

    // 3. Filtro de gatilho sobre a transcrição
    const triggerResult = this.filter.checkTrigger(prompt.triggerText, agent);
    if (!triggerResult.allowed) {
      this.logger.debug(`[AUDIO] Gatilho não acionado na transcrição: ${triggerResult.reason}`);
      return;
    }

    const finalUserMessage = triggerResult.cleanedText
      ? prompt.userMessage.replace(prompt.triggerText, triggerResult.cleanedText)
      : prompt.userMessage;

    this.logger.log(
      `[AUDIO] agent=${agent.id} | sender=${prompt.context.senderPhone} | transcrição="${finalUserMessage.slice(0, 80)}"`,
    );

    const transcribed: TextIncomingMessage = {
      webhookEventId: msg.webhookEventId,
      companyId: msg.companyId,
      messageId: msg.messageId,
      chatId: msg.chatId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderPhone: msg.senderPhone,
      isFromMe: msg.isFromMe,
      wasSentByApi: msg.wasSentByApi,
      isGroup: msg.isGroup,
      groupName: msg.groupName,
      timestamp: msg.timestamp,
      instanceName: msg.instanceName,
      instanceToken: msg.instanceToken,
      type: MessageType.TEXT,
      text: prompt.triggerText,
    };
    await this.waitingAck.maybeSend(transcribed, agent, { dedupe: false });

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
      content: finalUserMessage,
      originalType: prompt.originalMessageType,
    });

    this.logger.log(`[AUDIO] conversation=${conversation.id} | invocando LLM`);

    const finalPrompt = { ...prompt, userMessage: finalUserMessage };
    await this.agentRunner.run(finalPrompt, conversation, agent);
  }
}
