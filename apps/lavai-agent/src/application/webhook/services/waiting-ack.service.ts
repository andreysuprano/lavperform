import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';
import {
  AgentKind,
  type AgentWithConfigsData,
} from '../../agent/ports/agent.repository.port';
import { PLAYGROUND_CHAT_PREFIX } from '../../agent-playground/playground-conversation';
import { MESSAGE_SENDER_PORT } from '../../agent-runner/ports/message-sender.port';
import type { MessageSenderPort } from '../../agent-runner/ports/message-sender.port';
import {
  matchesHelpKeyword,
  whatsappPhonesMatch,
} from '../../customer-journey/services/journey-template.service';
import {
  CONVERSATION_REPOSITORY,
  MessageRole,
} from '../ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../ports/conversation.repository.port';
import {
  MessageType,
  type IncomingMessage,
} from '../types/incoming-message.types';
import { HumanTakeoverService } from './human-takeover.service';
import { MessageFilterService } from './message-filter.service';

const WAITING_ACK_TTL_SECONDS = 120;

/**
 * Envia uma saudação curta assim que a mensagem entra, antes do buffer e do modelo.
 * A chave no Redis evita repetir a mesma frase em textos consecutivos.
 */
@Injectable()
export class WaitingAckService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WaitingAckService.name);
  private redis!: IORedis;

  constructor(
    private readonly configService: ConfigService,
    @Inject(MESSAGE_SENDER_PORT)
    private readonly messageSender: MessageSenderPort,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepositoryPort,
    private readonly humanTakeover: HumanTakeoverService,
    private readonly filter: MessageFilterService,
  ) {}

  onModuleInit(): void {
    this.redis = new IORedis(
      this.configService.getOrThrow<string>('REDIS_URL'),
      {
        maxRetriesPerRequest: null,
        lazyConnect: false,
      },
    );
    this.logger.log('[WaitingAck] Conexão Redis inicializada');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async maybeSend(
    message: IncomingMessage,
    agent: AgentWithConfigsData,
    options?: { dedupe: boolean },
  ): Promise<void> {
    if (message.chatId.startsWith(PLAYGROUND_CHAT_PREFIX)) return;
    if (!agent.active || agent.kind !== AgentKind.PUBLIC) return;

    const text = agent.journeyConfig?.waitingAckMessage?.trim() ?? '';
    if (!agent.journeyConfig?.waitingAckEnabled || !text) return;
    if (message.isFromMe || message.wasSentByApi) return;
    if (await this.humanTakeover.isInTakeover(agent.id, message.chatId)) return;
    if (this.isIgnoredNotificationPhone(message, agent)) return;
    if (!this.passesAudience(message, agent)) return;

    const trigger = this.filter.checkTrigger(this.triggerText(message), agent);
    if (!trigger.allowed) return;
    if (this.isHelpEscalation(message, agent)) return;

    const key = this.buildKey(agent.id, message.chatId);
    if (options?.dedupe) {
      const stored = await this.redis.set(
        key,
        '1',
        'EX',
        WAITING_ACK_TTL_SECONDS,
        'NX',
      );
      if (stored !== 'OK') return;
    }

    try {
      await this.messageSender.send(
        {
          instanceName: message.instanceName,
          instanceToken: message.instanceToken,
          chatId: message.chatId,
        },
        { type: 'text', text },
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[WaitingAck] Falha ao enviar | agentId=${agent.id} | chatId=${message.chatId} | ${msg}`,
      );
      await this.deleteKey(key);
      return;
    }

    try {
      const conversation = await this.conversations.upsert({
        agentId: agent.id,
        companyId: message.companyId,
        chatId: message.chatId,
        userId: message.senderId,
        userPhone: message.senderPhone,
        userName: message.senderName,
        isGroup: message.isGroup,
        groupName: message.groupName,
        instanceName: message.instanceName,
        instanceToken: message.instanceToken,
      });
      await this.conversations.addMessage({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: text,
        originalType: 'WAITING_ACK',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[WaitingAck] Falha ao gravar histórico | agentId=${agent.id} | chatId=${message.chatId} | ${msg}`,
      );
    }
  }

  async clear(agentId: string, chatId: string): Promise<void> {
    await this.redis.del(this.buildKey(agentId, chatId));
  }

  private isIgnoredNotificationPhone(
    message: IncomingMessage,
    agent: AgentWithConfigsData,
  ): boolean {
    const notification = agent.notificationConfig;
    const staffPhone = notification?.helpNotificationPhone?.trim();
    return Boolean(
      notification?.helpNotificationIgnoreReplies &&
      staffPhone &&
      (whatsappPhonesMatch(message.senderPhone, staffPhone) ||
        whatsappPhonesMatch(message.chatId, staffPhone)),
    );
  }

  private passesAudience(
    message: IncomingMessage,
    agent: AgentWithConfigsData,
  ): boolean {
    const filter = agent.filterConfig;
    if (!filter) return true;

    if (filter.allowedPhones.length > 0) {
      const normalized = this.normalizePhone(message.senderPhone);
      const allowed = filter.allowedPhones.some(
        (phone) => this.normalizePhone(phone) === normalized,
      );
      if (!allowed) return false;
    }

    if (message.isGroup && filter.allowedGroups.length > 0) {
      if (!filter.allowedGroups.includes(message.chatId)) return false;
    }

    return true;
  }

  private isHelpEscalation(
    message: IncomingMessage,
    agent: AgentWithConfigsData,
  ): boolean {
    if (message.type !== MessageType.TEXT) return false;
    const journey = agent.journeyConfig;
    if (!journey?.enabled || !journey.helpAutoEscalate) return false;
    return matchesHelpKeyword(message.text, journey.helpKeywords);
  }

  private triggerText(message: IncomingMessage): string {
    if (message.type === MessageType.TEXT) return message.text;
    if (
      message.type === MessageType.IMAGE ||
      message.type === MessageType.VIDEO
    ) {
      return message.caption ?? '';
    }
    return '';
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private buildKey(agentId: string, chatId: string): string {
    return `waiting-ack:${agentId}:${chatId}`;
  }

  private async deleteKey(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[WaitingAck] Falha ao apagar chave | key=${key} | ${msg}`,
      );
    }
  }
}
